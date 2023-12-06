import { Module } from '@nestjs/common';
import { BiReportsService } from './bi-reports.service';
import { BiReportsController } from './bi-reports.controller';
import { ClarisaCredentialsBiService } from '../clarisa-credentials-bi.service';
import { HttpModule } from '@nestjs/axios';
import { BiReportRepository } from './repository/bi-report.repository';
import { TokenBiReportRepository } from './repository/token-bi-reports.repository';

@Module({
  imports: [HttpModule],
  controllers: [BiReportsController],
  providers: [
    BiReportsService,
    ClarisaCredentialsBiService,
    BiReportRepository,
    TokenBiReportRepository,
  ],
})
export class BiReportsModule {}
