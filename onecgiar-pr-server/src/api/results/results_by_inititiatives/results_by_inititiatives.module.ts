import { Module } from '@nestjs/common';
import { ResultsByInititiativesService } from './results_by_inititiatives.service';
import { ResultsByInititiativesController } from './results_by_inititiatives.controller';

@Module({
  controllers: [ResultsByInititiativesController],
  providers: [ResultsByInititiativesService]
})
export class ResultsByInititiativesModule {}
