import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateFaqDto {
    @IsNotEmpty()
    @IsString()
    question: string;

    @IsNotEmpty()
    @IsString()
    answer: string;
}

export class UpdateFaqDto {
    @IsOptional()
    @IsString()
    question?: string;

    @IsOptional()
    @IsString()
    answer?: string;
}
