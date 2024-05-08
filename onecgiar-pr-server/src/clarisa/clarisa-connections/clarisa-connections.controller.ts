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

  @Get('qa/token/:officialCode')
  findOne(
    @Param('officialCode') officialCode: string,
    @UserToken() user: TokenDto,
  ) {
    return this.clarisaConnectionsService.clarisaQaToken(officialCode, user);
  }
}
