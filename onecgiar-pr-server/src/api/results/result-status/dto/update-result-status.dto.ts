import { PartialType } from '@nestjs/mapped-types';
import { CreateResultStatusDto } from './create-result-status.dto';

export class UpdateResultStatusDto extends PartialType(CreateResultStatusDto) {}
