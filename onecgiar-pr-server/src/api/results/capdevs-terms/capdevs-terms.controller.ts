import { Controller, Get, HttpException } from '@nestjs/common';
import { CapdevsTermsService } from './capdevs-terms.service';

@Controller()
export class CapdevsTermsController {
  constructor(private readonly capdevsTermsService: CapdevsTermsService) {}

  @Get('get/all')
  async findAll() {
    const { message, response, status } =
      await this.capdevsTermsService.findAll();
    throw new HttpException({ message, response }, status);
  }
}
