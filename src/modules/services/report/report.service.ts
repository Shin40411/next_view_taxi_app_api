import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportService {
    async generatePartnerReport(data: any[]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Báo cáo Tài xế');

        sheet.columns = [
            { header: 'STT', key: 'stt', width: 10 },
            { header: 'Tên Đơn vị hưởng', key: 'partnerName', width: 30 },
            { header: 'Số tài khoản hưởng', key: 'accountNumber', width: 20 },
            { header: 'Ngân hàng hưởng', key: 'bankName', width: 20 },
            { header: 'Số tiền', key: 'amount', width: 20 },
            { header: 'Diễn giải chi tiết', key: 'description', width: 50 },
        ];

        data.forEach((row, index) => {
            sheet.addRow({
                stt: index + 1,
                partnerName: row.partnerName,
                accountNumber: row.accountNumber,
                bankName: row.bankName,
                amount: row.totalPoints,
                description: `Thanh toán điểm thưởng cho ${row.partnerName}`,
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return buffer as unknown as Buffer;
    }

    async generateServicePointReport(data: any[]): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Báo cáo Điểm dịch vụ');

        sheet.columns = [
            { header: 'STT', key: 'stt', width: 10 },
            { header: 'Tên Đơn vị hưởng', key: 'servicePointName', width: 30 },
            { header: 'Số tài khoản hưởng', key: 'accountNumber', width: 20 },
            { header: 'Ngân hàng hưởng', key: 'bankName', width: 20 },
            { header: 'Số tiền', key: 'amount', width: 20 },
            { header: 'Diễn giải chi tiết', key: 'description', width: 50 },
        ];

        data.forEach((row, index) => {
            sheet.addRow({
                stt: index + 1,
                servicePointName: row.servicePointName,
                accountNumber: row.accountNumber,
                bankName: row.bankName,
                amount: Math.abs(row.totalCost),
                description: `Thanh toán điểm nợ cho ${row.servicePointName}`,
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return buffer as unknown as Buffer;
    }
}
