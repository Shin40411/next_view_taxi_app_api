import { IsNumber, Min, IsNotEmpty } from 'class-validator';

export class TipDriverDto {
    @IsNumber({}, { message: 'Số hoa hồng phải là số' })
    @Min(1, { message: 'Số hoa hồng phải lớn hơn 0' })
    @IsNotEmpty({ message: 'Vui lòng nhập số hoa hồng' })
    amount: number;
}
