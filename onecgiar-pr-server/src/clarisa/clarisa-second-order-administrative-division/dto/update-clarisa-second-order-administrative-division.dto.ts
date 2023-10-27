import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaSecondOrderAdministrativeDivisionDto } from './create-clarisa-second-order-administrative-division.dto';

export class UpdateClarisaSecondOrderAdministrativeDivisionDto extends PartialType(
  CreateClarisaSecondOrderAdministrativeDivisionDto,
) {}
