import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaTocPhaseDto } from './create-clarisa-toc-phase.dto';

export class UpdateClarisaTocPhaseDto extends PartialType(CreateClarisaTocPhaseDto) {}
