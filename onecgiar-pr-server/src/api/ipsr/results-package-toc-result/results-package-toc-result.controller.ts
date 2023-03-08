import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { CreateResultsPackageTocResultDto } from './dto/create-results-package-toc-result.dto';
import { UpdateResultsPackageTocResultDto } from './dto/update-results-package-toc-result.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

@Controller()
export class ResultsPackageTocResultController {
  constructor(private readonly resultsPackageTocResultService: ResultsPackageTocResultService) {}

  @Post('create/:innoPackageId')
  create(
    @Body() createResultsPackageTocResultDto: CreateResultsPackageTocResultDto,
    @UserToken() user: TokenDto
    ) {
    //return this.resultsPackageTocResultService.create(createResultsPackageTocResultDto, user);
  }

  @Get()
  findAll() {
    return this.resultsPackageTocResultService.findAll();
  }

  @Get('get/:innoPackageId')
  findOne(@Param('id') id: string) {
    return this.resultsPackageTocResultService.findOne(+id);
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
