import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaActionAreaDto } from './create-clarisa-action-area.dto';

export class UpdateClarisaActionAreaDto extends PartialType(CreateClarisaActionAreaDto) {}
