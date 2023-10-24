import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Headers,
  HttpException,
} from '@nestjs/common';
import { ShareResultRequestService } from './share-result-request.service';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { CreateTocShareResult } from './dto/create-toc-share-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ShareResultRequest } from './entities/share-result-request.entity';

@Controller()
export class ShareResultRequestController {
  constructor(
    private readonly shareResultRequestService: ShareResultRequestService,
  ) {}

  @Post('create/:resultId')
  async reateRequest(
    @Body() createTocShareResult: CreateTocShareResult,
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.shareResultRequestService.resultRequest(
        createTocShareResult,
        resultId,
        token,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('get/all')
  async findAll(@Headers() auth: HeadersDto) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.shareResultRequestService.getResultRequestByUser(token);
    throw new HttpException({ message, response }, status);
  }

  @Patch('update')
  async updateRequest(
    @Headers() auth: HeadersDto,
    @Body() updateShareResultRequestDto: ShareResultRequest,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.shareResultRequestService.updateResultRequestByUser(
        updateShareResultRequestDto,
        token,
      );
    throw new HttpException({ message, response }, status);
  }

  @Get('get/status')
  async getAllStatus() {
    const { message, response, status } =
      await this.shareResultRequestService.getAllStatus();
    throw new HttpException({ message, response }, status);
  }
}
