import { PartialType } from '@nestjs/mapped-types';
import { CreateGlobalNarrativeDto } from './create-global-narrative.dto';

export class UpdateGlobalNarrativeDto extends PartialType(CreateGlobalNarrativeDto) {}
