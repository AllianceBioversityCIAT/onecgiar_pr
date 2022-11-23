import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsImpactAreaTargetDto } from './create-results-impact-area-target.dto';

export class UpdateResultsImpactAreaTargetDto extends PartialType(CreateResultsImpactAreaTargetDto) {}
