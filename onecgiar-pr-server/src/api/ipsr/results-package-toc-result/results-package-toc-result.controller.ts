import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { CreateResultsPackageTocResultDto } from './dto/create-results-package-toc-result.dto';
import { UpdateResultsPackageTocResultDto } from './dto/update-results-package-toc-result.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
export class ResultsPackageTocResultController {
  constructor(private readonly resultsPackageTocResultService: ResultsPackageTocResultService) {}

  @Post('create/:resultId')
  async create(
    @Body() createResultsPackageTocResultDto: CreateResultsPackageTocResultDto,
    @Param('resultId') resultId: number,
    @UserToken() user: TokenDto
    ) {
      createResultsPackageTocResultDto.result_id = resultId;
      const { message, response, status } =
      await this.resultsPackageTocResultService.create(createResultsPackageTocResultDto, user);

      throw new HttpException({ message, response }, status);
  }

  @Get()
  findAll() {
    return this.resultsPackageTocResultService.findAll();
  }

  @Get('get/:resultId')
  findOne(@Param('resultId') resultId: string) {
    return this.resultsPackageTocResultService.findOne(+resultId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsPackageTocResultDto: UpdateResultsPackageTocResultDto) {
    return this.resultsPackageTocResultService.update(+id, updateResultsPackageTocResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsPackageTocResultService.remove(+id);
  }
}
