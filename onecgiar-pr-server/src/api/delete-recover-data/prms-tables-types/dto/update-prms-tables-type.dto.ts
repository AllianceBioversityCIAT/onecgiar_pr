import { PartialType } from '@nestjs/mapped-types';
import { CreatePrmsTablesTypeDto } from './create-prms-tables-type.dto';

export class UpdatePrmsTablesTypeDto extends PartialType(CreatePrmsTablesTypeDto) {}
