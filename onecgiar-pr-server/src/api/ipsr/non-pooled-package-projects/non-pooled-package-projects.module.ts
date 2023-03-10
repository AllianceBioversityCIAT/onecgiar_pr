import { Module } from '@nestjs/common';
import { NonPooledPackageProjectsService } from './non-pooled-package-projects.service';
import { NonPooledPackageProjectsController } from './non-pooled-package-projects.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [NonPooledPackageProjectsController],
  providers: [
    NonPooledPackageProjectsService,
    HandlersError
  ],
  exports: []
})
export class NonPooledPackageProjectsModule {}
