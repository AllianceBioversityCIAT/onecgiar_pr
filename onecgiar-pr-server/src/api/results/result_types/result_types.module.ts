import { Module } from '@nestjs/common';
import { ResultTypesService } from './result_types.service';
import { ResultTypesController } from './result_types.controller';

@Module({
  controllers: [ResultTypesController],
  providers: [ResultTypesService]
})
export class ResultTypesModule {}
