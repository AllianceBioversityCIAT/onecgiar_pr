import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaSdgDto } from './create-clarisa-sdg.dto';

export class UpdateClarisaSdgDto extends PartialType(CreateClarisaSdgDto) {}
