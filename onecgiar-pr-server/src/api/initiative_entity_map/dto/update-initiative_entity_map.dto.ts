import { PartialType } from '@nestjs/swagger';
import { CreateInitiativeEntityMapDto } from './create-initiative_entity_map.dto';

export class UpdateInitiativeEntityMapDto extends PartialType(
  CreateInitiativeEntityMapDto,
) {}
