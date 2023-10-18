import { Controller, Post, Body, HttpException } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';
import { CreateResultCountryDto } from './dto/create-result-country.dto';

@Controller()
export class ResultCountriesController {
  constructor(
    private readonly resultCountriesService: ResultCountriesService,
  ) {}

  @Post('create')
  async create(@Body() createResultCountryDto: CreateResultCountryDto) {
    const { message, response, status } =
      await this.resultCountriesService.create(createResultCountryDto);
    throw new HttpException({ message, response }, status);
  }
}
