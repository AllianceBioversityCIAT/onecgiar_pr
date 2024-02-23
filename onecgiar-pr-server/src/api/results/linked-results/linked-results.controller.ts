import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { LinkedResultsService } from './linked-results.service';
import { CreateLinkedResultDto } from './dto/create-linked-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class LinkedResultsController {
  constructor(private readonly linkedResultsService: LinkedResultsService) {}

  @Post('create/:resultId')
  create(
    @Body() createLinkedResultDto: CreateLinkedResultDto,
    @UserToken() user: TokenDto,
    @Param('resultId') resultId: number,
  ) {
    createLinkedResultDto.result_id = resultId;
    return this.linkedResultsService.create(createLinkedResultDto, user);
  }

  @Get('get/:resultId')
  findAllByResult(@Param('resultId') resultId: number) {
    return this.linkedResultsService.findAllLinksByResult(resultId);
  }
}
