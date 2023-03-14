import { PartialType } from '@nestjs/mapped-types';
import { CreateInnovationPathwayDto } from './create-innovation-pathway.dto';

export class UpdateInnovationPathwayDto extends PartialType(CreateInnovationPathwayDto) {}
