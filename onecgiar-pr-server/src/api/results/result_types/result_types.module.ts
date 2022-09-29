import { Module } from '@nestjs/common';
import { ResultTypesService } from './result_types.service';
import { ResultTypesController } from './result_types.controller';
import { ResultTypeRepository } from './resultType.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultTypesController],
  providers: [
    ResultTypesService,
    ResultTypeRepository,
    HandlersError
  ],
  exports: [
    ResultTypesService,
    ResultTypeRepository
  ]
})
export class ResultTypesModule {}
