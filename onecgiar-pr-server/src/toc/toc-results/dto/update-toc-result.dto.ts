import { PartialType } from '@nestjs/mapped-types';
import { CreateTocResultDto } from './create-toc-result.dto';

export class UpdateTocResultDto extends PartialType(CreateTocResultDto) {}
