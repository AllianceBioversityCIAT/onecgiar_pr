import { PartialType } from '@nestjs/mapped-types';
import { CreateVersioningDto } from './create-versioning.dto';

export class UpdateVersioningDto extends PartialType(CreateVersioningDto) {}
