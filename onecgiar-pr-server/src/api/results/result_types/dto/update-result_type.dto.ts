import { PartialType } from '@nestjs/mapped-types';
import { CreateResultTypeDto } from './create-result_type.dto';

export class UpdateResultTypeDto extends PartialType(CreateResultTypeDto) {}
