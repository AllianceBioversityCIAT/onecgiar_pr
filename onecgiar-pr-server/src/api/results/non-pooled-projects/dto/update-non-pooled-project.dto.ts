import { PartialType } from '@nestjs/mapped-types';
import { CreateNonPooledProjectDto } from './create-non-pooled-project.dto';

export class UpdateNonPooledProjectDto extends PartialType(
  CreateNonPooledProjectDto,
) {}
