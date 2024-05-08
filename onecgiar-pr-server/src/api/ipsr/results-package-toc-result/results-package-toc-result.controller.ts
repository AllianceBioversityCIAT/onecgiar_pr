import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { CreateResultsPackageTocResultDto } from './dto/create-results-package-toc-result.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultsPackageTocResultController {
  constructor(
    private readonly resultsPackageTocResultService: ResultsPackageTocResultService,
  ) {}

  @Patch('save/:resultId')
  create(
    @Body() createResultsPackageTocResultDto: CreateResultsPackageTocResultDto,
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    createResultsPackageTocResultDto.result_id = resultId;
    return this.resultsPackageTocResultService.create(
      createResultsPackageTocResultDto,
      user,
    );
  }

  @Get('get/:resultId')
  findOne(@Param('resultId') resultId: string) {
    return this.resultsPackageTocResultService.findOne(+resultId);
  }
}
