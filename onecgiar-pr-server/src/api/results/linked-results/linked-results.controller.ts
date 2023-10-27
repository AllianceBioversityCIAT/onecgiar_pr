import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpException,
} from '@nestjs/common';
import { LinkedResultsService } from './linked-results.service';
import { CreateLinkedResultDto } from './dto/create-linked-result.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
export class LinkedResultsController {
  constructor(private readonly linkedResultsService: LinkedResultsService) {}

  @Post('create/:resultId')
  async create(
    @Body() createLinkedResultDto: CreateLinkedResultDto,
    @Headers() auth: HeadersDto,
    @Param('resultId') resultId: number,
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    createLinkedResultDto.result_id = resultId;
    const { message, response, status } =
      await this.linkedResultsService.create(createLinkedResultDto, token);
    throw new HttpException({ message, response }, status);
  }

  @Get('get/:resultId')
  async findAllByResult(@Param('resultId') resultId: number) {
    const { message, response, status } =
      await this.linkedResultsService.findAllLinksByResult(resultId);
    throw new HttpException({ message, response }, status);
  }
}
