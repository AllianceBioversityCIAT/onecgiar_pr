import { PartialType } from '@nestjs/mapped-types';
import { CreateNonPooledPackageProjectDto } from './create-non-pooled-package-project.dto';

export class UpdateNonPooledPackageProjectDto extends PartialType(
  CreateNonPooledPackageProjectDto,
) {}
