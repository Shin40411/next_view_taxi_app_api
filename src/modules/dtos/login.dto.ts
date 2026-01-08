import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    username: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    password: string;
}
