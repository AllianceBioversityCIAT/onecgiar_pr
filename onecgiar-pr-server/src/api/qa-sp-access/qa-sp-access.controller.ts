import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { QaSpAccessService } from './qa-sp-access.service';

/**
 * P2-3911 — `GET /api/qa/sp-link`, behind Reporting's JWT (`auth` header). Mounted next to the
 * QA catalog module under `/api/qa`, but in its own module: the catalog controller is guarded by
 * the CLARISA API key, this one by the user session.
 */
@Controller('sp-link')
@ApiTags('QA Science Program access')
@UseInterceptors(ResponseInterceptor)
export class QaSpAccessController {
  constructor(private readonly qaSpAccessService: QaSpAccessService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get a one-time code to open the Science Program view of the QA platform',
  })
  @ApiQuery({
    name: 'programCode',
    required: false,
    description:
      'Program official code (e.g. SP01). Required unless the user is a Reporting admin.',
  })
  async getSpLink(
    @UserToken() user: TokenDto,
    @Query('programCode') programCode?: string,
  ) {
    const link = await this.qaSpAccessService.getSpLink(user, programCode);
    return {
      response: link,
      message: 'Quality Assurance link issued',
      status: HttpStatus.OK,
    };
  }
}
