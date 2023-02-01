import { Module } from '@nestjs/common';
import { TypeOneReportService } from './type-one-report.service';
import { TypeOneReportController } from './type-one-report.controller';
import { RouterModule } from '@nestjs/core';
import { typeOneReportRoutes } from './type-one-report.routes';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { TypeOneReportRepository } from './type-one-report.repository';

@Module({
  controllers: [TypeOneReportController],
  imports: [RouterModule.register(typeOneReportRoutes)],
  providers: [TypeOneReportService,HandlersError, TypeOneReportRepository],
})
export class TypeOneReportModule {}
