import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaInnovationCharacteristicDto } from './create-clarisa-innovation-characteristic.dto';

export class UpdateClarisaInnovationCharacteristicDto extends PartialType(
  CreateClarisaInnovationCharacteristicDto,
) {}
