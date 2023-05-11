import {
  Controller,
  Get,
  Param,
  Header,
  ParseIntPipe,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { PlatformReportService } from './platform-report.service';
import { CreatePlatformReportDto } from './dto/create-platform-report.dto';
import { UpdatePlatformReportDto } from './dto/update-platform-report.dto';
import { Response } from 'express';
import { DateFormatter } from '../../shared/utils/date-formatter';

@Controller()
export class PlatformReportController {
  constructor(private readonly _platformReportService: PlatformReportService) {}

  @Get('/result/:id')
  async getFullResultReportByResultCode(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const utcDateString = new Date().toISOString();
    /*
      TODO to be fixed when the Temporal proposal on ECMA passes. This is a
      dirty workaround to "get the current UTC Date". When this is done, the
      "hackyUtcDate" Date object is created with the time as if it were on UTC, but
      with on the "Colombia timezone". As I do not care about the timezone and
      I am only interested in the milis to give a correct representation of
      the date when the report is generated, this suffices for now.
    */
    const hackyUtcDate = new Date(
      utcDateString.slice(0, utcDateString.length - 1),
    );
    const dateFormatted = DateFormatter.forFilename(hackyUtcDate);

    res.set({
      //'Content-Type': 'application/pdf',
      'Content-Disposition': `filename="PRMS-Result-${id}_${dateFormatted.date}_${dateFormatted.time}.pdf"`,
    });

    return new StreamableFile(
      await this._platformReportService.getFullResultReportByResultCode(id),
      { type: 'application/pdf' },
    );
  }
}
