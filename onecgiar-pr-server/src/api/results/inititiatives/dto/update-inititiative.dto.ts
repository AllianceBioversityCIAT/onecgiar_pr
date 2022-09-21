import { PartialType } from '@nestjs/mapped-types';
import { CreateInititiativeDto } from './create-inititiative.dto';

export class UpdateInititiativeDto extends PartialType(CreateInititiativeDto) {}
