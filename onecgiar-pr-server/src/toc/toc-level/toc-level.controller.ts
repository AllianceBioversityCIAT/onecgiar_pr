import { Controller, Get, HttpException } from '@nestjs/common';
import { TocLevelService } from './toc-level.service';

@Controller()
export class TocLevelController {
  constructor(private readonly tocLevelService: TocLevelService) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } = await this.tocLevelService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
