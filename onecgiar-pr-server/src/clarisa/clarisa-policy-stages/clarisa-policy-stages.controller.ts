import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaPolicyStagesService } from './clarisa-policy-stages.service';

@Controller()
export class ClarisaPolicyStagesController {
  constructor(
    private readonly clarisaPolicyStagesService: ClarisaPolicyStagesService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaPolicyStagesService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
