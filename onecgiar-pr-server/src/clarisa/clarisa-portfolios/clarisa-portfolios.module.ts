import { Module } from '@nestjs/common';
import { ClarisaPortfoliosService } from './clarisa-portfolios.service';
import { ClarisaPortfoliosController } from './clarisa-portfolios.controller';
import { ClarisaPortfoliosRepository } from './clarisa-portfolios.repository';

@Module({
  controllers: [ClarisaPortfoliosController],
  providers: [ClarisaPortfoliosService, ClarisaPortfoliosRepository],
  exports: [ClarisaPortfoliosRepository],
})
export class ClarisaPortfoliosModule {}
