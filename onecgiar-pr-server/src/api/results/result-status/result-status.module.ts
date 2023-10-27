import { Module } from '@nestjs/common';
import { ResultStatusService } from './result-status.service';
import { ResultStatusController } from './result-status.controller';
import { ResultStatusRepository } from './result-status.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultStatusController],
  providers: [ResultStatusService, ResultStatusRepository, HandlersError],
  exports: [ResultStatusRepository],
})
export class ResultStatusModule {}
