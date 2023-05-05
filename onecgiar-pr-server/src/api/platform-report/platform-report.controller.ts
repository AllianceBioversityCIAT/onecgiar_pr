import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Header,
  ParseIntPipe,
  StreamableFile,
} from '@nestjs/common';
import { PlatformReportService } from './platform-report.service';
import { CreatePlatformReportDto } from './dto/create-platform-report.dto';
import { UpdatePlatformReportDto } from './dto/update-platform-report.dto';

@Controller()
export class PlatformReportController {
  constructor(private readonly _platformReportService: PlatformReportService) {}

  @Get('/result/:id')
  @Header('Content-Type', 'application/pdf')
  async getFullResultReportByResultCode(@Param('id', ParseIntPipe) id: number) {
    return new StreamableFile(
      await this._platformReportService.getFullResultReportByResultCode(id),
    );
  }
}
