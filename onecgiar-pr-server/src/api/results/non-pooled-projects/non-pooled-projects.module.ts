import { Module } from '@nestjs/common';
import { NonPooledProjectsService } from './non-pooled-projects.service';
import { NonPooledProjectsController } from './non-pooled-projects.controller';
import { NonPooledProjectRepository } from './non-pooled-projects.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [NonPooledProjectsController],
  providers: [NonPooledProjectsService, NonPooledProjectRepository, HandlersError],
  exports: [
    NonPooledProjectRepository
  ]
})
export class NonPooledProjectsModule {}
