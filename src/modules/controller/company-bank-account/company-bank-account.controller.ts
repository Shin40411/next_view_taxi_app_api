import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CompanyBankAccountService } from '../../services/company-bank-account/company-bank-account.service';
import { CreateCompanyBankAccountDto } from '../../dtos/create-company-bank-account.dto';
import { UpdateCompanyBankAccountDto } from '../../dtos/update-company-bank-account.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SafeThrottlerGuard } from 'src/common/guards/safe-throttler.guard';

@Controller('company-bank-account')
@UseGuards(SafeThrottlerGuard)
export class CompanyBankAccountController {
    constructor(private readonly service: CompanyBankAccountService) { }

    @Post()
    create(@Body() dto: CreateCompanyBankAccountDto) {
        return this.service.create(dto);
    }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get('active')
    findActive() {
        return this.service.findActive();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateCompanyBankAccountDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
