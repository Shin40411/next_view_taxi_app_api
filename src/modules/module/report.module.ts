import { Module } from '@nestjs/common';
import { ReportService } from '../services/report/report.service';

@Module({
    providers: [ReportService],
    exports: [ReportService],
})
export class ReportModule { }
