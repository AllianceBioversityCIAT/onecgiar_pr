import { Controller, Get, HttpException } from '@nestjs/common';
import { ResultStatusService } from './result-status.service';

@Controller()
export class ResultStatusController {
  constructor(private readonly resultStatusService: ResultStatusService) {}

  @Get('all')
  async findAll() {
    const { response, message, status } =
      await this.resultStatusService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
