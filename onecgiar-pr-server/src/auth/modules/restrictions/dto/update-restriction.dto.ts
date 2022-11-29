import { PartialType } from '@nestjs/mapped-types';
import { CreateRestrictionDto } from './create-restriction.dto';

export class UpdateRestrictionDto extends PartialType(CreateRestrictionDto) {}
