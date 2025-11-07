import { Module } from '@nestjs/common';
import { ResultIpMeasuresService } from './result-ip-measures.service';
import { ResultIpMeasuresController } from './result-ip-measures.controller';
import { ResultIpMeasureRepository } from './result-ip-measures.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultIpMeasuresController],
  providers: [
    ResultIpMeasuresService,
    ResultIpMeasureRepository,
    HandlersError,
  ],
  exports: [ResultIpMeasuresService, ResultIpMeasureRepository],
})
export class ResultIpMeasuresModule {}
