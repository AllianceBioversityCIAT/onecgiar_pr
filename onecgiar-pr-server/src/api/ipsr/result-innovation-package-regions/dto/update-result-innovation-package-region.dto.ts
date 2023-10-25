import { PartialType } from '@nestjs/mapped-types';
import { CreateResultInnovationPackageRegionDto } from './create-result-innovation-package-region.dto';

export class UpdateResultInnovationPackageRegionDto extends PartialType(
  CreateResultInnovationPackageRegionDto,
) {}
