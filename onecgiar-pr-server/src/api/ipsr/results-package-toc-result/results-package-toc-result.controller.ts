import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  HttpException,
} from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { CreateResultsPackageTocResultDto } from './dto/create-results-package-toc-result.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
export class ResultsPackageTocResultController {
  constructor(
    private readonly resultsPackageTocResultService: ResultsPackageTocResultService,
  ) {}

  @Patch('save/:resultId')
  async create(
    @Body() createResultsPackageTocResultDto: CreateResultsPackageTocResultDto,
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto,
  ) {
    createResultsPackageTocResultDto.result_id = resultId;
    const { message, response, status } =
      await this.resultsPackageTocResultService.create(
        createResultsPackageTocResultDto,
        user,
      );

    throw new HttpException({ message, response }, status);
  }

  @Get('get/:resultId')
  findOne(@Param('resultId') resultId: string) {
    return this.resultsPackageTocResultService.findOne(+resultId);
  }
}
