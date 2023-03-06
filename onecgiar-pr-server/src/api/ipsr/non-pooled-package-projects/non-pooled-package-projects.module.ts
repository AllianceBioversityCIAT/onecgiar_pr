import { Module } from '@nestjs/common';
import { NonPooledPackageProjectsService } from './non-pooled-package-projects.service';
import { NonPooledPackageProjectsController } from './non-pooled-package-projects.controller';

@Module({
  controllers: [NonPooledPackageProjectsController],
  providers: [NonPooledPackageProjectsService]
})
export class NonPooledPackageProjectsModule {}
