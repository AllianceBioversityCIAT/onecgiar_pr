import { Module } from '@nestjs/common';
import { TypeOneReportService } from './type-one-report.service';
import { TypeOneReportController } from './type-one-report.controller';
import { RouterModule } from '@nestjs/core';
import { typeOneReportRoutes } from './type-one-report.routes';
import { HandlersError, ReturnResponse } from 'src/shared/handlers/error.utils';
import { TypeOneReportRepository } from './type-one-report.repository';
import { PrimaryImpactAreaModule } from './primary-impact-area/primary-impact-area.module';

@Module({
  controllers: [TypeOneReportController],
  imports: [
    RouterModule.register(typeOneReportRoutes),
    PrimaryImpactAreaModule,
  ],
  providers: [
    TypeOneReportService,
    HandlersError,
    TypeOneReportRepository,
    ReturnResponse,
  ],
})
export class TypeOneReportModule {}
