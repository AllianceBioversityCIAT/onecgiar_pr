import { PartialType } from '@nestjs/mapped-types';
import { CreateResultByInstitutionsByDeliveriesTypeDto } from './create-result-by-institutions-by-deliveries-type.dto';

export class UpdateResultByInstitutionsByDeliveriesTypeDto extends PartialType(
  CreateResultByInstitutionsByDeliveriesTypeDto,
) {}
