
import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException, Query, Put, Param } from '@nestjs/common';
import { ContractService } from 'src/modules/services/contract/contract.service';
import { CreateContractDto } from 'src/modules/dtos/create-contract.dto';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { UserRole } from 'src/utils/user-role.enum';

@Controller('contracts')
@UseGuards(AuthGuard)
export class ContractController {
    constructor(private readonly contractService: ContractService) { }

    @Post()
    async create(@Body() createContractDto: CreateContractDto, @Request() req) {
        return this.contractService.create(createContractDto, { id: req.user.sub } as any);
    }

    @Get('me')
    async getCurrentContract(@Request() req) {
        return this.contractService.findOneByUserId(req.user.sub);
    }

    @Get('user/:userId')
    async getContractByUserId(@Request() req, @Param('userId') userId: string) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admin can view user contract');
        }
        return this.contractService.findOneByUserId(userId);
    }

    @Get()
    async findAll(@Request() req, @Query('page') page: number, @Query('limit') limit: number) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admin can view all contracts');
        }
        return this.contractService.findAll(Number(page) || 1, Number(limit) || 10);
    }

    @Put(':id/terminate')
    async terminate(@Request() req, @Param('id') id: string) {
        if (req.user.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only admin can terminate contracts');
        }
        return this.contractService.terminate(id);
    }


}
