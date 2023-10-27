import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaRegionsService } from './clarisa-regions.service';

@Controller()
export class ClarisaRegionsController {
  constructor(private readonly clarisaRegionsService: ClarisaRegionsService) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaRegionsService.findAllNoParent();
    throw new HttpException({ message, response }, status);
  }
}
