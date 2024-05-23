import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ClarisaSecondOrderAdministrativeDivisionService } from './clarisa-second-order-administrative-division.service';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class ClarisaSecondOrderAdministrativeDivisionController {
  constructor(
    private readonly clarisaSecondOrderAdministrativeDivisionService: ClarisaSecondOrderAdministrativeDivisionService,
  ) {}

  @Get('iso-alpha-2/:isoAlpha2/admin-code-1/:adminCode1')
  findAll(
    @Param('isoAlpha2') isoAlpha2: string,
    @Param('adminCode1') adminCode1: string,
  ) {
    return this.clarisaSecondOrderAdministrativeDivisionService.getIsoAlpha2AdminCode(
      isoAlpha2,
      adminCode1,
    );
  }
}
