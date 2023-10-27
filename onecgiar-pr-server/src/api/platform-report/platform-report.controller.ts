import {
  Controller,
  Get,
  Param,
  StreamableFile,
  Res,
  Query,
} from '@nestjs/common';
import { PlatformReportService } from './platform-report.service';
import { Response } from 'express';
import { returnErrorDto } from '../../shared/handlers/error.utils';
import { ReadStream } from 'typeorm/platform/PlatformTools';

@Controller()
export class PlatformReportController {
  constructor(private readonly _platformReportService: PlatformReportService) {}

  @Get('/result/:code')
  async getFullResultReportByResultCode(
    @Param('code') code: string,
    @Query() query: { phase: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | returnErrorDto> {
    code = code?.trim();
    query.phase = query.phase?.trim();
    let result =
      await this._platformReportService.getFullResultReportByResultCode(
        code,
        query.phase,
      );

    if (result?.['message']) {
      return <returnErrorDto>result;
    }
    result = <{ pdf: ReadStream; filename_date: any }>result;

    res.set({
      //'Content-Type': 'application/pdf',
      'Content-Disposition': `filename="PRMS-Result-${code}_${result.filename_date}.pdf"`,
    });

    return new StreamableFile(result.pdf, { type: 'application/pdf' });
  }
}
