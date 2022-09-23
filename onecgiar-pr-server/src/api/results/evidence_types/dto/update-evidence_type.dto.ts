import { PartialType } from '@nestjs/mapped-types';
import { CreateEvidenceTypeDto } from './create-evidence_type.dto';

export class UpdateEvidenceTypeDto extends PartialType(CreateEvidenceTypeDto) {}
