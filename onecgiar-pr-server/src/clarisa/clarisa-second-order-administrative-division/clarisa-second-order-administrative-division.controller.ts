import { Controller, Get, Param, HttpException } from '@nestjs/common';
import { ClarisaSecondOrderAdministrativeDivisionService } from './clarisa-second-order-administrative-division.service';

@Controller()
export class ClarisaSecondOrderAdministrativeDivisionController {
  constructor(
    private readonly clarisaSecondOrderAdministrativeDivisionService: ClarisaSecondOrderAdministrativeDivisionService,
  ) {}

  @Get('iso-alpha-2/:isoAlpha2/admin-code-1/:adminCode1')
  async findAll(
    @Param('isoAlpha2') isoAlpha2: string,
    @Param('adminCode1') adminCode1: string,
  ) {
    const { response, message, status } =
      await this.clarisaSecondOrderAdministrativeDivisionService.getIsoAlpha2AdminCode(
        isoAlpha2,
        adminCode1,
      );
    throw new HttpException({ message, response }, status);
  }
}
