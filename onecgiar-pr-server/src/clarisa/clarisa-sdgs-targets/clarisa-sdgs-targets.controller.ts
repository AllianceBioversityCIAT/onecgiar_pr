import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaSdgsTargetsService } from './clarisa-sdgs-targets.service';

@Controller()
export class ClarisaSdgsTargetsController {
  constructor(
    private readonly clarisaSdgsTargetsService: ClarisaSdgsTargetsService,
  ) {}

  @Get('all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaSdgsTargetsService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
