import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClarisaSubnationalScopeService } from './clarisa-subnational-scope.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaSubnationalScopeController {
  constructor(
    private readonly clarisaSubnationalScopeService: ClarisaSubnationalScopeService,
  ) {}

  @Get('get/all')
  async findAll() {
    return await this.clarisaSubnationalScopeService.findAll();
  }

  @Get('get/by-country-iso2/:country_iso2')
  async findByCountryIso2(@Param('country_iso2') country_iso2: string) {
    return await this.clarisaSubnationalScopeService.findByCountryIso2(
      country_iso2,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.clarisaSubnationalScopeService.findOne(id);
  }
}
