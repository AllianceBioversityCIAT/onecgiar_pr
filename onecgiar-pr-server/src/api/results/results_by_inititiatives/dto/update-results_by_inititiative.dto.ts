import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsByInititiativeDto } from './create-results_by_inititiative.dto';

export class UpdateResultsByInititiativeDto extends PartialType(CreateResultsByInititiativeDto) {}
