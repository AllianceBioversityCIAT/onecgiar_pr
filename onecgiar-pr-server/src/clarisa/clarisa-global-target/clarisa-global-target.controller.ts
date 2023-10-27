import { Controller, Get } from '@nestjs/common';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';
import { HttpException } from '@nestjs/common';

@Controller()
export class ClarisaGlobalTargetController {
  constructor(
    private readonly clarisaGlobalTargetService: ClarisaGlobalTargetService,
  ) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.clarisaGlobalTargetService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
