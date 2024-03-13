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
    return this.getReportByResultCode(
      code,
      query.phase,
      res,
      PlatformReportEnum.FULL_RESULT_REPORT,
    );
  }

  @Get('/ipsr/:code')
  async getFullIPSRReportByResultCode(
    @Param('code') code: string,
    @Query() query: { phase: string; downloadable: boolean },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | returnErrorDto> {
    return this.getReportByResultCode(
      code,
      query.phase,
      res,
      PlatformReportEnum.FULL_IPSR_REPORT,
    );
  }

  private async getReportByResultCode(
    code: string,
    phase: string,
    res: Response,
    reportType: PlatformReportEnum,
  ): Promise<StreamableFile | returnErrorDto> {
    code = code?.trim();
    phase = phase?.trim();
    let result =
      await this._platformReportService.getFullResultReportByResultCode(
        code,
        phase,
        reportType,
      );

    if (result?.['message']) {
      return <returnErrorDto>result;
    }
    result = <{ pdf: ReadStream; filename_date: any }>result;

    const contentDisposition = `attachment;filename="PRMS-Result-${code}_${result.filename_date}.pdf"`;

    res.set({
      'Content-Disposition': contentDisposition,
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });

    return new StreamableFile(result.pdf, { type: 'application/pdf' });
  }
}
