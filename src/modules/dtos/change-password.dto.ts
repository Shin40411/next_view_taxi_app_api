import { IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(100)
    oldPassword: string;

    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(100)
    newPassword: string;
}
