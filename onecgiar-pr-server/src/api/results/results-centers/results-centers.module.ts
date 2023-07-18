import { Module } from '@nestjs/common';
import { ResultsCentersService } from './results-centers.service';
import { ResultsCentersController } from './results-centers.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultsCenterRepository } from './results-centers.repository';

@Module({
  controllers: [ResultsCentersController],
  providers: [
    ResultsCentersService,
    HandlersError,
    ResultsCenterRepository,
    ReturnResponse,
  ],
  exports: [ResultsCenterRepository],
})
export class ResultsCentersModule {}
