
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PartnerStatus } from 'src/utils/partner-status.enum';

export class UpdatePartnerStatusDto {
    @IsNotEmpty()
    @IsEnum(PartnerStatus)
    status: PartnerStatus;

    @IsOptional()
    @IsString()
    reason?: string;
}
