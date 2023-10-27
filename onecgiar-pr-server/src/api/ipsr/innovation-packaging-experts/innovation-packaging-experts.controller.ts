import { Controller, Get, HttpException } from '@nestjs/common';
import { InnovationPackagingExpertsService } from './innovation-packaging-experts.service';

@Controller()
export class InnovationPackagingExpertsController {
  constructor(
    private readonly innovationPackagingExpertsService: InnovationPackagingExpertsService,
  ) {}
  @Get('expertises')
  async findAllExpertises() {
    const { message, response, status } =
      await this.innovationPackagingExpertsService.findAllExpertises();
    throw new HttpException({ message, response }, status);
  }
}
