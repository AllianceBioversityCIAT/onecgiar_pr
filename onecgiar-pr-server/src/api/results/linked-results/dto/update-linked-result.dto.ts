import { PartialType } from '@nestjs/mapped-types';
import { CreateLinkedResultDto } from './create-linked-result.dto';

export class UpdateLinkedResultDto extends PartialType(CreateLinkedResultDto) {}
