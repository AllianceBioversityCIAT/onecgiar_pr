import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';
import { CreateResultCountryDto } from './dto/create-result-country.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UserToken } from '../../../shared/decorators/user-token.decorator';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { LockedWhileInQa } from '../../../shared/guards/qa-review-lock.guard';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ResultCountriesController {
  constructor(
    private readonly resultCountriesService: ResultCountriesService,
  ) {}

  @LockedWhileInQa({ body: 'result_id' })
  @Post('create')
  create(
    @Body() createResultCountryDto: CreateResultCountryDto,
    @UserToken() user: TokenDto,
  ) {
    return this.resultCountriesService.create(createResultCountryDto, user);
  }
}
