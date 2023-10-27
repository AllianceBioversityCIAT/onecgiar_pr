import { Controller, Get } from '@nestjs/common';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaInstitutionsTypeController {
  constructor(
    private readonly clarisaInstitutionsTypeService: ClarisaInstitutionsTypeService,
  ) {}

  @Get('tree')
  async findAll() {
    const { message, response, status } =
      await this.clarisaInstitutionsTypeService.findAllNotLegacy();
    throw new HttpException({ message, response }, status);
  }
}
