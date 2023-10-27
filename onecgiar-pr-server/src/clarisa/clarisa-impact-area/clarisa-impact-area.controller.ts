import { Controller, Get } from '@nestjs/common';
import { ClarisaImpactAreaService } from './clarisa-impact-area.service';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaImpactAreaController {
  constructor(
    private readonly clarisaImpactAreaService: ClarisaImpactAreaService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaImpactAreaService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
