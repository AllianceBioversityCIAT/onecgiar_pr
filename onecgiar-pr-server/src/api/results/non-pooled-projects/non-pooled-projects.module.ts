import { Module } from '@nestjs/common';
import { NonPooledProjectsService } from './non-pooled-projects.service';
import { NonPooledProjectsController } from './non-pooled-projects.controller';
import { NonPooledProjectRepository } from './non-pooled-projects.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Module({
  controllers: [NonPooledProjectsController],
  providers: [NonPooledProjectsService, NonPooledProjectRepository, HandlersError, ResponseInterceptor],
  exports: [
    NonPooledProjectRepository
  ]
})
export class NonPooledProjectsModule { }
