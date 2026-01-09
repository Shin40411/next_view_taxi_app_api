import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Sanitize } from 'src/utils/transformers/sanitize.transformer';

export class LoginDto {

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    @Sanitize()
    username: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    password: string;
}
