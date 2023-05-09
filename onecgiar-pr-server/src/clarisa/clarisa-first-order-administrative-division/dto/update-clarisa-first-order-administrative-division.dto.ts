import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaFirstOrderAdministrativeDivisionDto } from './create-clarisa-first-order-administrative-division.dto';

export class UpdateClarisaFirstOrderAdministrativeDivisionDto extends PartialType(CreateClarisaFirstOrderAdministrativeDivisionDto) {}
