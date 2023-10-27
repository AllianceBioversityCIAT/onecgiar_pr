import { PartialType } from '@nestjs/mapped-types';
import { CreateResultInnovationPackageDto } from './create-result-innovation-package.dto';

export class UpdateResultInnovationPackageDto extends PartialType(
  CreateResultInnovationPackageDto,
) {}
