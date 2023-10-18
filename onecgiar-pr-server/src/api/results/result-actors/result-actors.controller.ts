import { Controller, Get, HttpException } from '@nestjs/common';
import { ResultActorsService } from './result-actors.service';

@Controller()
export class ResultActorsController {
  constructor(private readonly resultActorsService: ResultActorsService) {}

  @Get('type/all')
  async findAll() {
    const { message, response, status } =
      await this.resultActorsService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
