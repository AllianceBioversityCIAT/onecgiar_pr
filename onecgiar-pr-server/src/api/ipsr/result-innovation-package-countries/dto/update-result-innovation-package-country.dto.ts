import { PartialType } from '@nestjs/mapped-types';
import { CreateResultInnovationPackageCountryDto } from './create-result-innovation-package-country.dto';

export class UpdateResultInnovationPackageCountryDto extends PartialType(CreateResultInnovationPackageCountryDto) {}
