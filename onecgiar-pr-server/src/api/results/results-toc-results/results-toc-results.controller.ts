import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, HttpException } from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { UpdateResultsTocResultDto } from './dto/update-results-toc-result.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';

@Controller()
export class ResultsTocResultsController {
  constructor(private readonly resultsTocResultsService: ResultsTocResultsService) {}

  @Post('create/toc/result/:resultId')
  async create(
    @Body() createResultsTocResultDto: CreateResultsTocResultDto,
    @Headers() auth: HeadersDto,
    @Param('resultId') resultId: number
    ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    createResultsTocResultDto.result_id = resultId;
    const {message, response, status} = 
      await this.resultsTocResultsService.create(createResultsTocResultDto, token);
    throw new HttpException({ message, response }, status);
  }

  @Get()
  findAll() {
    return this.resultsTocResultsService.findAll();
  }

  @Get('get/result/:resultId')
  async finTocByResult(@Param('resultId') resultId: number) {
    const {message, response, status} = 
      await this.resultsTocResultsService.getTocByResult(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateResultsTocResultDto: UpdateResultsTocResultDto) {
    return this.resultsTocResultsService.update(+id, updateResultsTocResultDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultsTocResultsService.remove(+id);
  }
}
