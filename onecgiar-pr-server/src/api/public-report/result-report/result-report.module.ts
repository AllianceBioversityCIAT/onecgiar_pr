import { Module } from '@nestjs/common';
import { ResultReportService } from './result-report.service';
import { ResultReportController } from './result-report.controller';

@Module({
  controllers: [ResultReportController],
  providers: [ResultReportService]
})
export class ResultReportModule {}
