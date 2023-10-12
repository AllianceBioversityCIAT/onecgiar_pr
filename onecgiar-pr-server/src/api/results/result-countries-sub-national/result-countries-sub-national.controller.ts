import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ResultCountriesSubNationalService } from './result-countries-sub-national.service';
import { CreateResultCountriesSubNationalDto } from './dto/create-result-countries-sub-national.dto';
import { UpdateResultCountriesSubNationalDto } from './dto/update-result-countries-sub-national.dto';

@Controller('result-countries-sub-national')
export class ResultCountriesSubNationalController {
  constructor(
    private readonly resultCountriesSubNationalService: ResultCountriesSubNationalService,
  ) {}

  @Post()
  create(
    @Body()
    createResultCountriesSubNationalDto: CreateResultCountriesSubNationalDto,
  ) {
    return this.resultCountriesSubNationalService.create(
      createResultCountriesSubNationalDto,
    );
  }

  @Get()
  findAll() {
    return this.resultCountriesSubNationalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resultCountriesSubNationalService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateResultCountriesSubNationalDto: UpdateResultCountriesSubNationalDto,
  ) {
    return this.resultCountriesSubNationalService.update(
      +id,
      updateResultCountriesSubNationalDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resultCountriesSubNationalService.remove(+id);
  }
}
