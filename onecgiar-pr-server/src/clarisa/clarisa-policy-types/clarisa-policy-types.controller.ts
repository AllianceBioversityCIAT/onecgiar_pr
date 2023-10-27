import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaPolicyTypesService } from './clarisa-policy-types.service';

@Controller()
export class ClarisaPolicyTypesController {
  constructor(
    private readonly clarisaPolicyTypesService: ClarisaPolicyTypesService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaPolicyTypesService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
