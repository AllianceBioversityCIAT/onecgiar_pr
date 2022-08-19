import { Module } from '@nestjs/common';
import { TypeOneReportService } from './type-one-report.service';
import { TypeOneReportController } from './type-one-report.controller';
import { RouterModule } from '@nestjs/core';
import { typeOneReportRoutes } from './type-one-report.routes';

@Module({
  controllers: [TypeOneReportController],
  imports:[
    RouterModule.register(typeOneReportRoutes)
  ],
  providers: [TypeOneReportService]
})
export class TypeOneReportModule {}
