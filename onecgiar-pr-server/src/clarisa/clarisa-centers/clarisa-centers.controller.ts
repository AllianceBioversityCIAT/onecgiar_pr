import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaCentersService } from './clarisa-centers.service';

@Controller()
export class ClarisaCentersController {
  constructor(private readonly clarisaCentersService: ClarisaCentersService) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaCentersService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
