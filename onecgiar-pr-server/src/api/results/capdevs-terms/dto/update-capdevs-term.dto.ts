import { PartialType } from '@nestjs/mapped-types';
import { CreateCapdevsTermDto } from './create-capdevs-term.dto';

export class UpdateCapdevsTermDto extends PartialType(CreateCapdevsTermDto) {}
