import { Module } from '@nestjs/common';
import { BiReportsService } from './bi-reports.service';
import { BiReportsController } from './bi-reports.controller';
import { ClarisaCredentialsBiService } from '../clarisa-credentials-bi.service';
import { HttpModule } from '@nestjs/axios';
import { BiReportRepository } from './repository/bi-report.repository';
import { TokenBiReportRepository } from './repository/token-bi-reports.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { BiSubpagesRepository } from './repository/bi-subpages.repository';
import { DisabledEndpointGuard } from '../../shared/guards/disabled-endpoint.guard';

@Module({
  imports: [HttpModule],
  controllers: [BiReportsController],
  providers: [
    DisabledEndpointGuard,
    BiReportsService,
    ClarisaCredentialsBiService,
    BiReportRepository,
    TokenBiReportRepository,
    BiSubpagesRepository,
    HandlersError,
    ReturnResponse,
  ],
})
export class BiReportsModule {}
