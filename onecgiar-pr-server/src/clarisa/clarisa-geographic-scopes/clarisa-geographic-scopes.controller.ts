import { Controller, Get, HttpException } from '@nestjs/common';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';

@Controller()
export class ClarisaGeographicScopesController {
  constructor(
    private readonly clarisaGeographicScopesService: ClarisaGeographicScopesService,
  ) {}

  @Get('get/all/prms')
  async findAll() {
    const { message, response, status } =
      await this.clarisaGeographicScopesService.findAllPRMS();
    throw new HttpException({ message, response }, status);
  }
}
