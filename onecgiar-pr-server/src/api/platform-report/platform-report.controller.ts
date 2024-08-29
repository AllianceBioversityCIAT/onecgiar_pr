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
import { PlatformReportEnum } from './entities/platform-report.enum';

@Controller()
export class PlatformReportController {
  constructor(private readonly _platformReportService: PlatformReportService) {}

  @Get('/result/:code')
  async getFullResultReportByResultCode(
    @Param('code') code: string,
    @Query() query: { phase: string; downloadable: boolean },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | returnErrorDto> {
    code = code?.trim();
    query.phase = query.phase?.trim();
    let result =
      await this._platformReportService.getFullResultReportByResultCode(
        code,
        query.phase,
        PlatformReportEnum.FULL_RESULT_REPORT,
      );

    if (result?.['message']) {
      return <returnErrorDto>result;
    }
    result = <{ pdf: ReadStream; filename_date: any }>result;

    const contentDisposition = `${
      (query.downloadable ?? false) ? 'attachment;' : ''
    }filename="PRMS-Result-${code}_${result.filename_date}.pdf"`;

    res.set({
      'Content-Disposition': contentDisposition,
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });

    return new StreamableFile(result.pdf, { type: 'application/pdf' });
  }

  @Get('/ipsr/:code')
  async getFullIPSRReportByCode(
    @Param('code') code: string,
    @Query() query: { phase: string; downloadable: boolean },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | returnErrorDto> {
    code = code?.trim();
    query.phase = query.phase?.trim();
    let result =
      await this._platformReportService.getFullResultReportByResultCode(
        code,
        query.phase,
        PlatformReportEnum.FULL_IPSR_REPORT,
      );

    if (result?.['message']) {
      return <returnErrorDto>result;
    }
    result = <{ pdf: ReadStream; filename_date: any }>result;

    const contentDisposition = `${
      (query.downloadable ?? false) ? 'attachment;' : ''
    }filename="PRMS-Result-${code}_${result.filename_date}.pdf"`;

    res.set({
      'Content-Disposition': contentDisposition,
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });

    return new StreamableFile(result.pdf, { type: 'application/pdf' });
  }
}
