import { PartialType } from '@nestjs/mapped-types';
import { CreateShareResultInnovationPackageRequestDto } from './create-share-result-innovation-package-request.dto';

export class UpdateShareResultInnovationPackageRequestDto extends PartialType(
  CreateShareResultInnovationPackageRequestDto,
) {}
