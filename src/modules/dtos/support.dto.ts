import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateTicketDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    subject: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content: string;
}

export class ReplyTicketDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(5000)
    content: string;
}
