import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { V2, V3, V4 } from 'paseto';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Raw, DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { ServicePoint } from 'src/entities/service-point.entity';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/utils/user-role.enum';
import { PartnerProfile } from 'src/entities/partner-profile.entity';
import { User } from 'src/entities/user.entity';
import { RegisterDto } from 'src/modules/dtos/register-user.dto';

import { ZaloService } from 'src/modules/services/zalo/zalo.service';
import { MailService } from '../mail/mail.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AuthService {
    private readonly redis = new Redis({ host: 'localhost', port: 6379 });
    private readonly secretKey: Buffer;

    constructor(
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(PartnerProfile) private profileRepo: Repository<PartnerProfile>,
        @InjectRepository(ServicePoint) private serviceRepo: Repository<ServicePoint>,
        private configService: ConfigService,
        private zaloService: ZaloService,
        private settingsService: SettingsService,
        private mailService: MailService,
        private dataSource: DataSource,
    ) {
        const keyHex = this.configService.get<string>('PASETO_SECRET');
        if (!keyHex) {
            throw new Error('Missing PASETO_SECRET');
        }
        this.secretKey = Buffer.from(keyHex, 'hex');
    }

    async register(dto: RegisterDto) {
        if (dto.role === UserRole.ACCOUNTANT) {
            throw new ForbiddenException('Cannot register as ACCOUNTANT via public API');
        }

        // if (dto.role === UserRole.PARTNER) {
        //     if (!dto.id_card_front || !dto.id_card_back) {
        //         throw new BadRequestException('Đối tác bắt buộc phải có ảnh CCCD mặt trước và sau');
        //     }
        //     if (!dto.vehicle_plate) {
        //         throw new BadRequestException('Đối tác bắt buộc phải có biển số xe');
        //     }
        // }

        if (dto.role === UserRole.CUSTOMER) {
            if (!dto.tax_id) {
                throw new BadRequestException('Khách hàng bắt buộc phải nhập mã số thuế');
            }
        }

        const storedOtp = await this.redis.get(`register_otp:${dto.username}`);
        if (!storedOtp || storedOtp !== dto.otp) {
            throw new BadRequestException('Mã OTP không chính xác hoặc đã hết hạn');
        }

        const existingUser = await this.userRepo.findOne({
            where: [
                { username: dto.username, isDelete: false },
                { phone_number: dto.username, isDelete: false },
                ...(dto.email ? [{ email: dto.email, isDelete: false }] : [])
            ]
        });
        if (existingUser) {
            if (existingUser.username === dto.username || existingUser.phone_number === dto.username) {
                throw new ConflictException('Số điện thoại này đã được đăng ký');
            }
            if (dto.email && existingUser.email === dto.email) {
                throw new ConflictException('Email này đã được đăng ký');
            }
            throw new ConflictException('Tài khoản đã tồn tại');
        }

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(dto.password, salt);

        const newUser = this.userRepo.create({
            username: dto.username,
            password_hash: passwordHash,
            full_name: dto.full_name,
            role: dto.role || UserRole.CUSTOMER,
            email: dto.email,
            phone_number: dto.username,
            tax_id: dto.role === UserRole.CUSTOMER ? dto.tax_id : null,
        });

        const savedUser = await this.userRepo.save(newUser);

        if (dto.role === UserRole.PARTNER || dto.role === UserRole.INTRODUCER) {
            const profile = this.profileRepo.create({
                user: savedUser,
                vehicle_plate: dto.role === UserRole.PARTNER ? dto.vehicle_plate : (dto.vehicle_plate || ''),
                id_card_front: dto.id_card_front || null,
                id_card_back: dto.id_card_back || null,
                driver_license_front: dto.driver_license_front || null,
                driver_license_back: dto.driver_license_back || null,
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
                reward_amount: dto.reward_amount || 0,
                discount: dto.discount || 0,
                advertising_budget: 0,
                geofence_radius: 100,
                location: 'POINT(10.776111 106.701111)',
                province: dto.province,
            });
            await this.serviceRepo.save(servicePoint);
        }

        if (dto.email) {
            this.mailService.sendWelcomeEmail(dto.email, savedUser.full_name).catch((err) => {
                console.error(err);
            });
        }

        await this.redis.del(`register_otp:${dto.username}`);

        return {
            id: savedUser.id,
            username: savedUser.username,
            role: savedUser.role,
            message: 'Đăng ký thành công',
        };
    }

    async login(username: string, pass: string, otp?: string) {
        const user = await this.userRepo.findOne({
            where: [
                { username: username },
                { email: username },
                { phone_number: username }
            ]
        });

        if (!user || !(await bcrypt.compare(pass, user.password_hash))) {
            throw new UnauthorizedException('Tên tài khoản hoặc mật khẩu không chính xác');
        }

        if (user.isDelete) {
            throw new UnauthorizedException('Tài khoản đã bị khoá');
        }

        if (user.role !== UserRole.ADMIN && user.role !== UserRole.ACCOUNTANT) {
            if (!otp) {
                const isTrusted = await this.redis.get(`trusted_device:${user.username}`);
                if (!isTrusted) {
                    throw new BadRequestException('Vui lòng nhập mã OTP để tiếp tục');
                }
            }
        }

        if (otp) {
            const storedOtp = await this.redis.get(`login_otp:${user.username}`);
            if (!storedOtp || storedOtp !== otp) {
                throw new BadRequestException('Mã OTP không chính xác hoặc đã hết hạn');
            }
            await this.redis.del(`login_otp:${user.username}`);
            await this.redis.set(`trusted_device:${user.username}`, 'true', 'EX', 86400);
        }

        const sessionId = randomUUID();
        const payload = {
            sub: user.id,
            role: user.role,
            session_id: sessionId,
            exp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        };

        const token = await V3.encrypt(payload, this.secretKey);

        await this.redis.set(`auth:${user.id}:${sessionId}`, token, 'EX', 7200);

        return {
            access_token: token,
            user_id: user.id,
            role: user.role,
        };
    }

    async requestLoginOtp(body: { username: string; password: string }) {
        const { username, password } = body;
        const user = await this.userRepo.findOne({
            where: [
                { username: username },
                { email: username },
                { phone_number: username }
            ]
        });

        if (!user || user.isDelete) {
            throw new UnauthorizedException('Không tìm thấy tài khoản hoặc tài khoản đã bị khoá');
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            throw new UnauthorizedException('Tên tài khoản hoặc mật khẩu không chính xác');
        }

        if (user.role === UserRole.ADMIN || user.role === UserRole.ACCOUNTANT) {
            return { message: 'Xác thực thành công', requireOtp: false };
        }

        const isTrusted = await this.redis.get(`trusted_device:${user.username}`);
        if (isTrusted) {
            return { message: 'Thiết bị đã được tin cậy', requireOtp: false };
        }

        const existingOtp = await this.redis.get(`login_otp:${user.username}`);
        if (existingOtp) {
            return { message: 'Mã OTP đã được gửi, vui lòng kiểm tra lại', requireOtp: true };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await this.redis.set(`login_otp:${user.username}`, otp, 'EX', 300);

        const isEmail = username.includes('@');

        if (isEmail) {
            await this.mailService.sendOtp(username, otp, user.full_name);
        } else {
            const settings = await this.settingsService.getSettings();
            const templateId = settings?.zalo_template_id_otp;

            if (templateId) {
                try {
                    await this.zaloService.sendZns(user.username, templateId, {
                        otp: otp,
                        customer_name: user.full_name
                    });
                } catch (error) {
                    console.error('Failed to send Zalo Login OTP:', error.message);
                }
            }

            if (user.email) {
                await this.mailService.sendOtp(user.email, otp, user.full_name);
            }
        }

        return { message: 'Mã OTP đã được gửi', requireOtp: true };
    }

    async handleGoogleLogin(googleUser: any) {
        const { id, email, firstName, lastName, picture, phone, role } = googleUser;

        // 1. Unified Lookup (Allow finding deleted users to reactivate them)
        let user = await this.userRepo.findOne({
            where: [
                { google_id: id },
                ...(email ? [{ email: email }] : []),
                ...(phone ? [{ phone_number: phone }] : [])
            ],
            relations: ['partnerProfile']
        });

        // 2. If User Exists -> Update & Login
        if (user) {
            let hasUpdates = false;

            if (user.isDelete) {
                throw new UnauthorizedException('Tài khoản đã bị khoá');
            }

            if (!user.google_id) {
                user.google_id = id;
                hasUpdates = true;
            }
            if (!user.email && email) {
                user.email = email;
                hasUpdates = true;
            }
            if (!user.phone_number && phone) {
                user.phone_number = phone;
                hasUpdates = true;
            }

            if (hasUpdates) {
                await this.userRepo.save(user);
            }

            if (![UserRole.PARTNER, UserRole.INTRODUCER, UserRole.CUSTOMER].includes(user.role)) {
                throw new ForbiddenException('Thông tin đăng nhập đã tồn tại.');
            }

        } else {
            // 3. Register New User (Transaction)
            const createdUser = await this.dataSource.transaction(async (entityManager) => {
                const randomPass = Math.random().toString(36).slice(-8);
                const salt = await bcrypt.genSalt();
                const passwordHash = await bcrypt.hash(randomPass, salt);

                const newUsername = phone ? phone : email;
                const userRole = role === 'CUSTOMER' ? UserRole.CUSTOMER :
                    (role === 'INTRODUCER' ? UserRole.INTRODUCER : UserRole.PARTNER);

                const newUser = this.userRepo.create({
                    username: newUsername,
                    google_id: id,
                    email: email,
                    phone_number: phone || null,
                    password_hash: passwordHash,
                    full_name: `${firstName} ${lastName}`,
                    role: userRole,
                    avatar: picture || null,
                    tax_id: null,
                });

                const savedUser = await entityManager.save(User, newUser);

                if (userRole === UserRole.CUSTOMER) {
                    const servicePoint = this.serviceRepo.create({
                        owner: savedUser,
                        name: savedUser.full_name,
                        address: 'Chưa cập nhật...',
                        reward_amount: 0,
                        discount: 0,
                        advertising_budget: 0,
                        geofence_radius: 100,
                        location: 'POINT(10.776111 106.701111)',
                        province: undefined,
                    });
                    await entityManager.save(ServicePoint, servicePoint);
                } else {
                    const profile = this.profileRepo.create({
                        user: savedUser,
                        vehicle_plate: '',
                        id_card_front: null,
                        id_card_back: null,
                        driver_license_front: null,
                        driver_license_back: null,
                        is_online: false,
                        wallet_balance: 0,
                        current_location: 'POINT(0 0)',
                    });
                    await entityManager.save(PartnerProfile, profile);
                    savedUser.partnerProfile = profile;
                }

                if (email) {
                    this.mailService.sendWelcomeEmail(email, savedUser.full_name).catch((err) => {
                        console.error('Failed to send welcome email (Google Login):', err);
                    });
                }

                return savedUser;
            });
            user = createdUser;
        }

        if (!user) {
            throw new UnauthorizedException('Không thể tạo hoặc tìm thấy người dùng.');
        }

        // 4. Generate Token
        const sessionId = randomUUID();
        const payload = {
            sub: user.id,
            role: user.role,
            session_id: sessionId,
            exp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        };

        const token = await V3.encrypt(payload, this.secretKey);
        await this.redis.set(`auth:${user.id}:${sessionId}`, token, 'EX', 7200);

        let isNew = false;
        if (user.role === UserRole.CUSTOMER) {
            isNew = false;
        } else {
            isNew = !user.partnerProfile || user.partnerProfile.id_card_front === null;
        }

        return {
            access_token: token,
            user_id: user.id,
            role: user.role,
            full_name: user.full_name,
            username: user.username,
            avatar: user.avatar,
            is_new_google_user: isNew
        };
    }

    async logout(userId: string, sessionId?: string) {
        if (sessionId) {
            await this.redis.del(`auth:${userId}:${sessionId}`);
        } else {
            // Fallback for old tokens or mass logout (optional, but safer to do nothing or handle specific logic)
            // For now, let's try to delete the old key format just in case
            await this.redis.del(`auth:${userId}`);
        }
        return { message: 'Đăng xuất thành công' };
    }

    async validateToken(token: string) {
        try {
            const payload = await V3.decrypt(token, this.secretKey);
            const userId = payload.sub;
            const sessionId = payload.session_id;

            if (!sessionId) {
                // Backward compatibility for tokens during migration (optional)
                // Or just return null to force re-login
                return null;
            }

            const storedToken = await this.redis.get(`auth:${userId}:${sessionId}`);

            if (!storedToken || storedToken !== token) return null;

            return payload;
        } catch (e) {
            return null;
        }
    }

    async requestPasswordReset(username: string) {
        const user = await this.userRepo.findOne({
            where: [
                { username: username, isDelete: false },
                { phone_number: username, isDelete: false },
                { email: username, isDelete: false }
            ]
        });
        if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await this.redis.set(`reset_otp:${username}`, otp, 'EX', 300);

        const isEmail = username.includes('@');

        if (isEmail) {
            await this.mailService.sendOtp(username, otp, user.full_name);
        } else {
            const settings = await this.settingsService.getSettings();
            const templateId = settings?.zalo_template_id_otp;

            if (templateId) {
                try {
                    await this.zaloService.sendZns(username, templateId, {
                        otp: otp,
                        customer_name: user.full_name
                    });
                } catch (error) {
                    console.error('Failed to send Zalo OTP:', error.message);
                }
            }

            if (user.email) {
                await this.mailService.sendOtp(user.email, otp, user.full_name);
            }
        }

        return { message: 'Mã OTP đã được gửi' };
    }

    async verifyOtp(username: string, otp: string) {
        const storedOtp = await this.redis.get(`reset_otp:${username}`);

        if (!storedOtp || storedOtp !== otp) {
            throw new BadRequestException('Mã OTP không chính xác hoặc đã hết hạn');
        }

        return { message: 'Xác thực OTP thành công' };
    }

    async confirmPasswordReset(username: string, otp: string, newPassword: string) {
        const storedOtp = await this.redis.get(`reset_otp:${username}`);

        if (!storedOtp || storedOtp !== otp) {
            throw new BadRequestException('Mã OTP không chính xác hoặc đã hết hạn');
        }

        const user = await this.userRepo.findOne({
            where: [
                { username: username, isDelete: false },
                { phone_number: username, isDelete: false },
                { email: username, isDelete: false }
            ]
        });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(newPassword, salt);

        user.password_hash = passwordHash;
        await this.userRepo.save(user);

        await this.redis.del(`reset_otp:${username}`);

        return { message: 'Đổi mật khẩu thành công' };
    }

    async setPartnerStatus(userId: string, isOnline: boolean) {
        const user = await this.userRepo.findOne({ where: { id: userId, isDelete: false } });
        if (!user || (user.role !== UserRole.PARTNER && user.role !== UserRole.INTRODUCER)) {
            return;
        }

        const profile = await this.profileRepo.findOne({ where: { user: { id: userId } } });
        if (profile) {
            await this.profileRepo.update(profile.id, { is_online: isOnline });
        }
    }

    async changePassword(userId: string, oldPass: string, newPass: string) {
        const user = await this.userRepo.findOne({ where: { id: userId, isDelete: false } });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');

        const isMatch = await bcrypt.compare(oldPass, user.password_hash);
        if (!isMatch) {
            throw new BadRequestException('Mật khẩu cũ không chính xác');
        }

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(newPass, salt);

        user.password_hash = passwordHash;
        await this.userRepo.save(user);

        return { message: 'Đổi mật khẩu thành công' };
    }

    async requestContractOtp(userId: string) {
        const user = await this.userRepo.findOne({ where: { id: userId, isDelete: false } });
        if (!user) throw new NotFoundException('Người dùng không tồn tại');

        // console.log(user);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await this.redis.set(`contract_otp:${userId}`, otp, 'EX', 300);

        const settings = await this.settingsService.getSettings();
        // console.log(settings);
        if (user.email) {
            await this.mailService.sendOtp(user.email, otp, user.full_name);
        }

        const templateId = settings?.zalo_template_id_otp;
        if (templateId) {
            try {
                await this.zaloService.sendZns(user.username, templateId, {
                    otp: otp,
                    customer_name: user.full_name
                });
            } catch (error) {
                console.error('Failed to send Zalo Contract OTP:', error.message);
            }
        } else {
            console.warn('Missing Zalo Template ID for Contract OTP');
        }

        return { message: 'Mã OTP đã được gửi qua Zalo và Email' };
    }


    async verifyContractOtp(userId: string, otp: string) {
        const storedOtp = await this.redis.get(`contract_otp:${userId}`);

        if (!storedOtp || storedOtp !== otp) {
            throw new BadRequestException('Mã OTP không chính xác hoặc đã hết hạn');
        }

        await this.redis.del(`contract_otp:${userId}`);

        return { message: 'Xác thực OTP thành công' };
    }

    async requestRegisterOtp(body: { username: string; email: string; fullName: string }) {
        const { username, email, fullName } = body;
        const existingUser = await this.userRepo.findOne({
            where: [
                { username: username, isDelete: false },
                { phone_number: username, isDelete: false },
                ...(email ? [{ email: email, isDelete: false }] : [])
            ]
        });

        if (existingUser) {
            if (existingUser.username === username || existingUser.phone_number === username) {
                throw new ConflictException('Số điện thoại này đã được đăng ký');
            }
            if (email && (existingUser.username === email || existingUser.email === email)) {
                throw new ConflictException('Email này đã được đăng ký');
            }
            throw new ConflictException('Tài khoản đã tồn tại');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await this.redis.set(`register_otp:${username}`, otp, 'EX', 300);

        const isEmail = username.includes('@');

        if (isEmail) {
            await this.mailService.sendOtp(username, otp, fullName);
        } else {
            const settings = await this.settingsService.getSettings();
            const templateId = settings?.zalo_template_id_otp;

            if (templateId) {
                try {
                    await this.zaloService.sendZns(username, templateId, {
                        otp: otp,
                        customer_name: fullName
                    });
                } catch (error) {
                    console.error('Failed to send Zalo OTP:', error.message);
                }
            }

            if (email) {
                await this.mailService.sendOtp(email, otp, fullName);
            }
        }

        return { message: 'Mã OTP đã được gửi' };
    }
}