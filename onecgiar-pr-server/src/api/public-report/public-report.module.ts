import { Module } from '@nestjs/common';
import { PublicReportService } from './public-report.service';
import { PublicReportController } from './public-report.controller';
import { ResultReportModule } from './result-report/result-report.module';

@Module({
  controllers: [PublicReportController],
  providers: [PublicReportService],
  imports: [ResultReportModule]
})
export class PublicReportModule {}
