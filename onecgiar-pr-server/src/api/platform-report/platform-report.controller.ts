import {
  Controller,
  Get,
  Param,
  Header,
  ParseIntPipe,
  StreamableFile,
  Res,
  Query,
} from '@nestjs/common';
import { PlatformReportService } from './platform-report.service';
import { CreatePlatformReportDto } from './dto/create-platform-report.dto';
import { UpdatePlatformReportDto } from './dto/update-platform-report.dto';
import { Response, query } from 'express';
import { DateFormatter } from '../../shared/utils/date-formatter';
import { returnErrorDto } from '../../shared/handlers/error.utils';
import { ReadStream } from 'typeorm/platform/PlatformTools';

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
      );

    if (result?.['message']) {
      return <returnErrorDto>result;
    }
    result = <{ pdf: ReadStream; filename_date: any }>result;

    const contentDisposition = `${
      query.downloadable ?? false ? 'attachment;' : ''
    }filename="PRMS-Result-${code}_${result.filename_date}.pdf"`;

    res.set({
      'Content-Disposition': contentDisposition,
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });

    return new StreamableFile(result.pdf, { type: 'application/pdf' });
  }
}
