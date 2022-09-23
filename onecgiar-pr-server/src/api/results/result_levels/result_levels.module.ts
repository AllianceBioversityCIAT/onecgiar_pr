import { Module } from '@nestjs/common';
import { ResultLevelsService } from './result_levels.service';
import { ResultLevelsController } from './result_levels.controller';

@Module({
  controllers: [ResultLevelsController],
  providers: [ResultLevelsService]
})
export class ResultLevelsModule {}
