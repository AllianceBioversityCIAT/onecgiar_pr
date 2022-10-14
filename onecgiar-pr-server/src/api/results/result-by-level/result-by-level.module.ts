import { Module } from '@nestjs/common';
import { ResultByLevelService } from './result-by-level.service';
import { ResultByLevelController } from './result-by-level.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByLevelRepository } from './result-by-level.repository';
import { ResultLevelRepository } from '../result_levels/resultLevel.repository';
import { ResultTypeRepository } from '../result_types/resultType.repository';

@Module({
  controllers: [ResultByLevelController],
  providers: [ResultByLevelService, HandlersError, ResultByLevelRepository, ResultLevelRepository, ResultTypeRepository],
  exports: [ ResultByLevelRepository ]
})
export class ResultByLevelModule {}
