import { Controller, Post, Body, HttpException } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';
import { CreateResultCountryDto } from './dto/create-result-country.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';

@Controller()
export class ResultCountriesController {
  constructor(
    private readonly resultCountriesService: ResultCountriesService,
  ) {}

  @Post('create')
  async create(
    @Body() createResultCountryDto: CreateResultCountryDto,
    @UserToken() user: TokenDto,
  ) {
    const { message, response, status } =
      await this.resultCountriesService.create(createResultCountryDto, user);
    throw new HttpException({ message, response }, status);
  }
}
