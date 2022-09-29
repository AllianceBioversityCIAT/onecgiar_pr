import { Module } from '@nestjs/common';
import { ResultLevelsService } from './result_levels.service';
import { ResultLevelsController } from './result_levels.controller';
import { ResultLevelRepository } from './resultLevel.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultTypesModule } from '../result_types/result_types.module';

@Module({
  controllers: [ResultLevelsController],
  imports: [
    ResultTypesModule
  ],
  providers: [
    ResultLevelsService,
    ResultLevelRepository,
    HandlersError
  ],
  exports: [
    ResultLevelRepository,
    ResultLevelsService
  ]
})
export class ResultLevelsModule {}
