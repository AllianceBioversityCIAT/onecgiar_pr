import { Module } from '@nestjs/common';
import { BiReportsService } from './bi-reports.service';
import { BiReportsController } from './bi-reports.controller';
import { ClarisaCredentialsBiService } from '../clarisa-credentials-bi.service';
import { HttpModule } from '@nestjs/axios';
import { BiReportRepository } from './repository/bi-report.repository';
import { TokenBiReport } from './entities/token-bi-reports.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([TokenBiReport])],
  controllers: [BiReportsController],
  providers: [
    BiReportsService,
    ClarisaCredentialsBiService,
    BiReportRepository,
  ],
})
export class BiReportsModule {}
