import { PartialType } from '@nestjs/mapped-types';
import { CreateOstMeliaStudyDto } from './create-ost-melia-study.dto';

export class UpdateOstMeliaStudyDto extends PartialType(
  CreateOstMeliaStudyDto,
) {}
