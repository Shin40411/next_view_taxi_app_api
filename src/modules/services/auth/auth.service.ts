import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { V2, V3, V4 } from 'paseto';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw } from 'typeorm';
import { ServicePoint } from 'src/entities/service-point.entity';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/utils/user-role.enum';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { User } from 'src/entities/user.entity';
import { RegisterDto } from 'src/modules/dtos';

@Injectable()
export class AuthService {
    private readonly redis = new Redis({ host: 'localhost', port: 6379 });
    private readonly secretKey: Buffer;

    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
        @InjectRepository(ServicePoint) private serviceRepo: Repository<ServicePoint>,
        private configService: ConfigService,
    ) {
        const keyHex = this.configService.get<string>('PASETO_SECRET');
        if (!keyHex) {
            throw new Error('Missing PASETO_SECRET in .env file');
        }
        this.secretKey = Buffer.from(keyHex, 'hex');
    }

    async register(dto: RegisterDto) {
        if (dto.role === UserRole.PARTNER) {
            if (!dto.id_card_front || !dto.id_card_back) {
                throw new BadRequestException('Đối tác bắt buộc phải có ảnh CCCD mặt trước và sau');
            }
            if (!dto.vehicle_plate) {
                throw new BadRequestException('Đối tác bắt buộc phải có biển số xe');
            }
        }

        if (dto.role === UserRole.CUSTOMER) {
            if (!dto.tax_id) {
                throw new BadRequestException('Khách hàng bắt buộc phải nhập mã số thuế');
            }
        }

        const existingUser = await this.userRepo.findOne({ where: { username: dto.username } });
        if (existingUser) {
            throw new ConflictException('Tài khoản đã tồn tại');
        }

        const salt = await bcrypt.genSalt();
        // console.log('--- REGISTER DEBUG ---');
        // console.log(`Registering user: ${dto.username}`);
        // console.log(`Password to hash: '${dto.password}' (Length: ${dto.password.length})`);
        const passwordHash = await bcrypt.hash(dto.password, salt);
        // console.log('----------------------');

        const newUser = this.userRepo.create({
            username: dto.username,
            password_hash: passwordHash,
            full_name: dto.full_name,
            role: dto.role || UserRole.CUSTOMER,
            tax_id: dto.role === UserRole.CUSTOMER ? dto.tax_id : null,
        });

        const savedUser = await this.userRepo.save(newUser);

        if (dto.role === UserRole.PARTNER) {
            const profile = this.profileRepo.create({
                user: savedUser,
                vehicle_plate: dto.vehicle_plate,
                id_card_front: dto.id_card_front,
                id_card_back: dto.id_card_back,
                driver_license_front: dto.driver_license_front,
                driver_license_back: dto.driver_license_back,
                is_online: false,
                wallet_balance: 0,
                current_location: 'POINT(0 0)' as any,
            });
            await this.profileRepo.save(profile);
        }

        if (dto.role === UserRole.CUSTOMER) {
            const servicePoint = this.serviceRepo.create({
                owner: savedUser,
                name: dto.full_name,
                address: dto.address || 'Chưa cập nhật...',
                reward_amount: 0,
                advertising_budget: 0,
                geofence_radius: 100,
                location: 'POINT(10.776111 106.701111)',
            });
            await this.serviceRepo.save(servicePoint);
        }

        return {
            id: savedUser.id,
            username: savedUser.username,
            role: savedUser.role,
            message: 'Đăng ký thành công',
        };
    }

    async login(username: string, pass: string) {
        const user = await this.userRepo.findOne({ where: { username } });
        if (user) {
            // console.log('Stored password hash:', user.password_hash);
        }

        if (!user || !(await bcrypt.compare(pass, user.password_hash))) {
            throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
        }

        const payload = {
            sub: user.id,
            role: user.role,
            exp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        };

        const token = await V3.encrypt(payload, this.secretKey);

        await this.redis.set(`auth:${user.id}`, token, 'EX', 7200);

        return {
            access_token: token,
            user_id: user.id,
            role: user.role,
        };
    }

    async logout(userId: string) {
        await this.redis.del(`auth:${userId}`);
        return { message: 'Đăng xuất thành công' };
    }

    async validateToken(token: string) {
        try {
            const payload = await V3.decrypt(token, this.secretKey);
            const userId = payload.sub;
            const storedToken = await this.redis.get(`auth:${userId}`);

            if (!storedToken || storedToken !== token) return null;

            return payload;
        } catch (e) {
            return null;
        }
    }
}