import { UserRole } from "src/utils/user-role.enum";

export * from './create-user.dto';

export class RegisterDto {
    username: string;
    password: string;
    full_name: string;
    role: UserRole;
    vehicle_plate?: string;
    id_card_front?: string;
    id_card_back?: string;
    tax_id?: string;
    address?: string;
}