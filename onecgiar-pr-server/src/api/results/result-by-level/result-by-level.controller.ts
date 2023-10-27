import { Controller, Get, HttpException } from '@nestjs/common';
import { ResultByLevelService } from './result-by-level.service';

@Controller()
export class ResultByLevelController {
  constructor(private readonly resultByLevelService: ResultByLevelService) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.resultByLevelService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
