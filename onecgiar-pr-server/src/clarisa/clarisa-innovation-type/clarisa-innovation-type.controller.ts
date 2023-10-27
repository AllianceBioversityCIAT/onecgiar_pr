import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaInnovationTypeService } from './clarisa-innovation-type.service';

@Controller()
export class ClarisaInnovationTypeController {
  constructor(
    private readonly clarisaInnovationTypeService: ClarisaInnovationTypeService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaInnovationTypeService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
