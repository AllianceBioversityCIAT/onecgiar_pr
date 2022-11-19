import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaPolicyTypeDto } from './create-clarisa-policy-type.dto';

export class UpdateClarisaPolicyTypeDto extends PartialType(CreateClarisaPolicyTypeDto) {}
