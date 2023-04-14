import {
  Controller,
  Get,
  Param,
  StreamableFile,
  Header,
  ParseIntPipe,
} from '@nestjs/common';
import { ResultReportService } from './result-report.service';

@Controller()
export class ResultReportController {
  constructor(private readonly resultReportService: ResultReportService) {}

  @Get(':id')
  @Header('Content-Type', 'application/pdf')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return new StreamableFile(await this.resultReportService.findOne(id));
  }
}
