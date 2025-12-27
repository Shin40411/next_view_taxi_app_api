import { UserRole } from "src/utils/user-role.enum";

export class UpdateUserDto {
    full_name?: string;
    password?: string;
    is_active?: boolean;

    // Partner specific
    vehicle_plate?: string;
    brand?: string;
    id_card_front?: string;
    id_card_back?: string;
    driver_license_front?: string;
    driver_license_back?: string;

    // ServicePoint specific (Customer)
    address?: string;
    reward_amount?: number;
    advertising_budget?: number;
    geofence_radius?: number; // meters
    latitude?: number;
    longitude?: number;
}
