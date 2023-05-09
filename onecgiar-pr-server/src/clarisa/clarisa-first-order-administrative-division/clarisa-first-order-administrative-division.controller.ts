import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException } from '@nestjs/common';
import { ClarisaFirstOrderAdministrativeDivisionService } from './clarisa-first-order-administrative-division.service';
import { CreateClarisaFirstOrderAdministrativeDivisionDto } from './dto/create-clarisa-first-order-administrative-division.dto';
import { UpdateClarisaFirstOrderAdministrativeDivisionDto } from './dto/update-clarisa-first-order-administrative-division.dto';

@Controller()
export class ClarisaFirstOrderAdministrativeDivisionController {
  constructor(private readonly clarisaFirstOrderAdministrativeDivisionService: ClarisaFirstOrderAdministrativeDivisionService) { }

  @Get('iso-alpha-2/:isoAlpha2')
  async getIsoAlpha2(
    @Param('isoAlpha2') isoAlpha2: string
  ) {
    const { message, response, status } =
      await this.clarisaFirstOrderAdministrativeDivisionService.getIsoAlpha2(isoAlpha2);
    throw new HttpException({ message, response }, status);
  }

}
