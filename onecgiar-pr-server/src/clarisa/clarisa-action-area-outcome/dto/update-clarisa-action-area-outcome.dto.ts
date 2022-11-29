import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaActionAreaOutcomeDto } from './create-clarisa-action-area-outcome.dto';

export class UpdateClarisaActionAreaOutcomeDto extends PartialType(CreateClarisaActionAreaOutcomeDto) {}
