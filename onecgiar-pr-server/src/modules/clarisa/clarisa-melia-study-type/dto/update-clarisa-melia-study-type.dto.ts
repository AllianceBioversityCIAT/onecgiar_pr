import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaMeliaStudyTypeDto } from './create-clarisa-melia-study-type.dto';

export class UpdateClarisaMeliaStudyTypeDto extends PartialType(CreateClarisaMeliaStudyTypeDto) {}
