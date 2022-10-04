import { Module } from '@nestjs/common';
import { ResultsByInititiativesService } from './results_by_inititiatives.service';
import { ResultsByInititiativesController } from './results_by_inititiatives.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from './resultByInitiatives.repository';

@Module({
  controllers: [ResultsByInititiativesController],
  providers: [
    ResultsByInititiativesService,
    ResultByInitiativesRepository,
    HandlersError
  ],
  exports: [
    ResultsByInititiativesService,
    ResultByInitiativesRepository
  ]
})
export class ResultsByInititiativesModule {}
