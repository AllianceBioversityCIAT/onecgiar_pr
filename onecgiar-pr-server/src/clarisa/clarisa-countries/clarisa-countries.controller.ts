import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { HttpException } from '@nestjs/common';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaCountriesController {
  constructor(
    private readonly clarisaCountriesService: ClarisaCountriesService,
  ) {}

  @Get('get/all')
  findAll() {
    return this.clarisaCountriesService.findAllCountries();
  }
}
