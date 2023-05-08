import { PartialType } from '@nestjs/mapped-types';
import { CreateInnovationPackagingExpertDto } from './create-innovation-packaging-expert.dto';

export class UpdateInnovationPackagingExpertDto extends PartialType(CreateInnovationPackagingExpertDto) {}
