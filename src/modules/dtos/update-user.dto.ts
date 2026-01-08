import { UserRole } from "src/utils/user-role.enum";

export class UpdateUserDto {
    full_name?: string;
    avatar?: string;
    username?: string;
    email?: string;
    phone_number?: string;
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
    discount?: number;
    advertising_budget?: number;
    geofence_radius?: number; // meters
    latitude?: number;
    longitude?: number;
    province?: string;
    contract?: string;

    // Bank Account
    bank_name?: string;
    account_number?: string;
    account_holder_name?: string;
}
