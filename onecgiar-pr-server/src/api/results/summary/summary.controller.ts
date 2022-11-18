import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, HttpException } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { CreateSummaryDto } from './dto/create-summary.dto';
import { UpdateSummaryDto } from './dto/update-summary.dto';
import { InnovationUseDto } from './dto/create-innovation-use.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { HeadersDto } from '../../../shared/globalInterfaces/headers.dto';

@Controller()
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) { }

  @Post()
  create(@Body() createSummaryDto: CreateSummaryDto) {
    return this.summaryService.create(createSummaryDto);
  }

  @Patch('innovation-use/create/result/:resultId')
  async saveInnovationUse(
    @Param('resultId') resultId: number,
    @Body() innovationUseDto: InnovationUseDto,
    @Headers() auth: HeadersDto
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.summaryService.saveInnovationUse(innovationUseDto, resultId,token);
    throw new HttpException({ message, response }, status);
  }

  @Get('innovation-use/get/result/:resultId')
  async getInnovationUse(
    @Param('resultId') resultId: number,
    @Headers() auth: HeadersDto
  ) {
    const token: TokenDto = <TokenDto>(
      JSON.parse(Buffer.from(auth.auth.split('.')[1], 'base64').toString())
    );
    const { message, response, status } =
      await this.summaryService.getInnovationUse(resultId);
    throw new HttpException({ message, response }, status);
  }

  @Get()
  findAll() {
    return this.summaryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.summaryService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSummaryDto: UpdateSummaryDto) {
    return this.summaryService.update(+id, updateSummaryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.summaryService.remove(+id);
  }
}
