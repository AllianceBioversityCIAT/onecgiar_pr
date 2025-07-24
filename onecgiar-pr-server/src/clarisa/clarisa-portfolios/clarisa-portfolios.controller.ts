import { Controller, Get } from '@nestjs/common';
import { ClarisaPortfoliosService } from './clarisa-portfolios.service';
import { ClarisaPortfolios } from './entities/clarisa-portfolios.entity';

@Controller()
export class ClarisaPortfoliosController {
  constructor(
    private readonly clarisaPortfoliosService: ClarisaPortfoliosService,
  ) {}

  @Get()
  async findAll(): Promise<ClarisaPortfolios[]> {
    return this.clarisaPortfoliosService.findAll();
  }
}
