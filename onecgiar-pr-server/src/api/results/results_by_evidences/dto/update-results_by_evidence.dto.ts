import { PartialType } from '@nestjs/mapped-types';
import { CreateResultsByEvidenceDto } from './create-results_by_evidence.dto';

export class UpdateResultsByEvidenceDto extends PartialType(CreateResultsByEvidenceDto) {}
