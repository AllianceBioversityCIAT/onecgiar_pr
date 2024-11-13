import { Module } from '@nestjs/common';
import { GlobalNarrativesService } from './global-narratives.service';
import { GlobalNarrativesController } from './global-narratives.controller';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { GlobalNarrativeRepository } from './repositories/global-narratives.repository';

@Module({
  controllers: [GlobalNarrativesController],
  providers: [
    GlobalNarrativesService,
    ReturnResponse,
    GlobalNarrativeRepository,
  ],
})
export class GlobalNarrativesModule {}
