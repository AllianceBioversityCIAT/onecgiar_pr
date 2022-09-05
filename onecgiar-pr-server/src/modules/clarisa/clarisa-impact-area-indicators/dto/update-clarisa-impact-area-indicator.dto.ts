import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaImpactAreaIndicatorDto } from './create-clarisa-impact-area-indicator.dto';

export class UpdateClarisaImpactAreaIndicatorDto extends PartialType(CreateClarisaImpactAreaIndicatorDto) {}
