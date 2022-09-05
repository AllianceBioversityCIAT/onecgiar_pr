import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaImpactAreaDto } from './create-clarisa-impact-area.dto';

export class UpdateClarisaImpactAreaDto extends PartialType(CreateClarisaImpactAreaDto) {}
