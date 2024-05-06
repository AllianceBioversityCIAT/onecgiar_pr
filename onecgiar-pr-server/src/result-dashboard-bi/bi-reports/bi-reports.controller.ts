import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { BiReportsService } from './bi-reports.service';
import { CreateBiReportDto } from './dto/create-bi-report.dto';
import { GetBiSubpagesDto } from './dto/get-bi-subpages.dto';

@Controller()
export class BiReportsController {
  constructor(private readonly biReportsService: BiReportsService) {}

  @Post()
  create(@Body() createBiReportDto: CreateBiReportDto) {
    return this.biReportsService.create(createBiReportDto);
  }

  @Get()
  findAll() {
    return this.biReportsService.findAll();
  }

  @Get('/reports')
  findAllReports() {
    return this.biReportsService.findAllReports();
  }

  @Get('/report/:id')
  findOne(@Param('id') id: string) {
    return this.biReportsService.findOne(+id);
  }

  @Post('/reportName')
  findOneReportName(@Body() getBiSubpagesDto: GetBiSubpagesDto) {
    return this.biReportsService.findOneReportName(getBiSubpagesDto);
  }

  @Get('/reportName')
  findReportByName(@Query() getBiSubpagesDto: GetBiSubpagesDto) {
    return this.biReportsService.findOneReportName(getBiSubpagesDto);
  }

  @Get('/azure')
  findAzure() {
    return this.biReportsService.azureToken();
  }
}
