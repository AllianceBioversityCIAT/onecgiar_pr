import { PartialType } from '@nestjs/mapped-types';
import { CreateTocLevelDto } from './create-toc-level.dto';

export class UpdateTocLevelDto extends PartialType(CreateTocLevelDto) {}
