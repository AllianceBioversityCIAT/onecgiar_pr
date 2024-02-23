import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ShareResultRequestService } from './share-result-request.service';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateShareResultRequestDto } from './dto/create-share-result-request.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ShareResultRequestController {
  constructor(
    private readonly shareResultRequestService: ShareResultRequestService,
  ) {}

  @Post('create/:resultId')
  reateRequest(
    @Body() createTocShareResult: CreateTocShareResult,
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    return this.shareResultRequestService.resultRequest(
      createTocShareResult,
      resultId,
      user,
    );
  }

  @Get('get/all')
  @UseInterceptors(ResponseInterceptor)
  findAll(@UserToken() user: TokenDto) {
    return this.shareResultRequestService.getResultRequestByUser(user);
  }

  @Patch('update')
  updateRequest(
    @UserToken() user: TokenDto,
    @Body() createShareResultsRequestDto: CreateShareResultRequestDto,
  ) {
    return this.shareResultRequestService.updateResultRequestByUser(
      createShareResultsRequestDto,
      user,
    );
  }

  @Get('get/status')
  getAllStatus() {
    return this.shareResultRequestService.getAllStatus();
  }
}
