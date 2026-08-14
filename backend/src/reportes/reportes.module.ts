import { Module } from '@nestjs/common';
import { ExcelService } from './excel/excel.service';
import { PdfService } from './pdf/pdf.service';

@Module({
    providers: [ExcelService, PdfService],
    exports: [ExcelService, PdfService],
})
export class ReportesModule {}