import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import { ClarisaConnectionsService } from './clarisa-connections.service';
import { CreateClarisaConnectionDto } from './dto/create-clarisa-connection.dto';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../shared/decorators/user-token.decorator';
import { ReturnResponseUtil } from '../../shared/utils/response.util';
import { ApiOperation } from '@nestjs/swagger';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaConnectionsController {
  constructor(
    private readonly clarisaConnectionsService: ClarisaConnectionsService,
  ) {}

  @Post('partner-request/:resultId')
  create(
    @Body() createClarisaConnectionDto: CreateClarisaConnectionDto,
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
  ) {
    return this.clarisaConnectionsService.create(
      createClarisaConnectionDto,
      resultId,
      user,
    );
  }

  @Get('execute-task')
  executeTask() {
    this.clarisaConnectionsService.executeTask();
    return ReturnResponseUtil.format({
      message: 'Task executed',
      response: 'Task executed',
      statusCode: HttpStatus.OK,
    });
  }

  /**
   * @deprecated P2-3911 — legacy QA iframe token via CLARISA. Replaced by `GET /api/qa/sp-link`
   * (new QA Science Program view). Remove once the new QA is live in PROD.
   */
  @Get('qa/token/:officialCode')
  @ApiOperation({
    summary:
      'Legacy QA token via CLARISA (deprecated, use GET /api/qa/sp-link)',
    deprecated: true,
  })
  findOne(
    @Param('officialCode') officialCode: string,
    @UserToken() user: TokenDto,
  ) {
    return this.clarisaConnectionsService.clarisaQaToken(officialCode, user);
  }
}
