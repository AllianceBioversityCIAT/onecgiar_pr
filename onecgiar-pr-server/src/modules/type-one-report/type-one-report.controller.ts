import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TypeOneReportService } from './type-one-report.service';
import { CreateTypeOneReportDto } from './dto/create-type-one-report.dto';
import { UpdateTypeOneReportDto } from './dto/update-type-one-report.dto';

@Controller()
export class TypeOneReportController {
  constructor(private readonly typeOneReportService: TypeOneReportService) {}

  @Post()
  create(@Body() createTypeOneReportDto: CreateTypeOneReportDto) {
    return this.typeOneReportService.create(createTypeOneReportDto);
  }

  @Get()
  findAll() {
    return this.typeOneReportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.typeOneReportService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTypeOneReportDto: UpdateTypeOneReportDto,
  ) {
    return this.typeOneReportService.update(+id, updateTypeOneReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.typeOneReportService.remove(+id);
  }
}
