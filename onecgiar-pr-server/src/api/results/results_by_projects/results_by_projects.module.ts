import { Module } from '@nestjs/common';
import { ResultsByProjectsService } from './results_by_projects.service';
import { ResultsByProjectsController } from './results_by_projects.controller';
import { ResultsByProjectsRepository } from './results_by_projects.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsByProjectsController],
  providers: [
    ResultsByProjectsService,
    ResultsByProjectsRepository,
    HandlersError,
  ],
  exports: [ResultsByProjectsService, ResultsByProjectsRepository],
})
export class ResultsByProjectsModule {}
