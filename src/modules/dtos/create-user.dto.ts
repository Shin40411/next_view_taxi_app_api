import { UserRole } from "src/utils/user-role.enum";

export class CreateUserDto {
    username: string;
    password: string;
    full_name: string;
    role: UserRole;
    vehicle_plate?: string;
    brand?: string;
    id_card_front?: string;
    id_card_back?: string;
    tax_id?: string;
    driver_license?: string;
    driver_license_front?: string;
    driver_license_back?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    geofence_radius?: number;
    reward_amount?: number;
    is_active?: boolean;
}
