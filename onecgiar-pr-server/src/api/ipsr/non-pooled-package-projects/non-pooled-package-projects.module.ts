import { Module } from '@nestjs/common';
import { NonPooledPackageProjectsService } from './non-pooled-package-projects.service';
import { NonPooledPackageProjectsController } from './non-pooled-package-projects.controller';
import { NonPooledPackageProjectRepository } from './non-pooled-package-projects.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [NonPooledPackageProjectsController],
  providers: [
    NonPooledPackageProjectsService, 
    NonPooledPackageProjectRepository,
    HandlersError
  ],
  exports: [NonPooledPackageProjectRepository]
})
export class NonPooledPackageProjectsModule {}
