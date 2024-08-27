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
  ): Promise<{ pdf: string; fileName: string } | returnErrorDto> {
    code = code?.trim();
    query.phase = query.phase?.trim();
    let result =
      await this._platformReportService.getFullResultReportByResultCode(
        code,
        query.phase,
        PlatformReportEnum.FULL_RESULT_REPORT,
      );

    return result;
  }

  @Get('/ipsr/:code')
  async getFullIPSRReportByCode(
    @Param('code') code: string,
    @Query() query: { phase: string; downloadable: boolean },
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ pdf: string; fileName: string } | returnErrorDto> {
    code = code?.trim();
    query.phase = query.phase?.trim();
    let result =
      await this._platformReportService.getFullResultReportByResultCode(
        code,
        query.phase,
        PlatformReportEnum.FULL_IPSR_REPORT,
      );

    return result;
  }
}
