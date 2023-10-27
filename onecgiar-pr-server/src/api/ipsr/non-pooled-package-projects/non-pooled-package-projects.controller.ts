import { Controller } from '@nestjs/common';
import { NonPooledPackageProjectsService } from './non-pooled-package-projects.service';

@Controller('non-pooled-package-projects')
export class NonPooledPackageProjectsController {
  constructor(
    private readonly nonPooledPackageProjectsService: NonPooledPackageProjectsService,
  ) {}
}
