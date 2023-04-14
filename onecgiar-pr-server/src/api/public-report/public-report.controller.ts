import { Controller, Get } from '@nestjs/common';
import { PublicReportService } from './public-report.service';

@Controller()
export class PublicReportController {
  constructor(private readonly publicReportService: PublicReportService) {}

  @Get()
  findAll() {
    return this.publicReportService.findAll();
  }
}
