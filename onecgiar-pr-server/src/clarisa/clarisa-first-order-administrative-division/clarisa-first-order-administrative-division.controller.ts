import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClarisaFirstOrderAdministrativeDivisionService } from './clarisa-first-order-administrative-division.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaFirstOrderAdministrativeDivisionController {
  constructor(
    private readonly clarisaFirstOrderAdministrativeDivisionService: ClarisaFirstOrderAdministrativeDivisionService,
  ) {}

  @Get('iso-alpha-2/:isoAlpha2')
  getIsoAlpha2(@Param('isoAlpha2') isoAlpha2: string) {
    return this.clarisaFirstOrderAdministrativeDivisionService.getIsoAlpha2(
      isoAlpha2,
    );
  }
}
