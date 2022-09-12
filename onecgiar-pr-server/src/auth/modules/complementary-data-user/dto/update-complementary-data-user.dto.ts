import { PartialType } from '@nestjs/mapped-types';
import { CreateComplementaryDataUserDto } from './create-complementary-data-user.dto';

export class UpdateComplementaryDataUserDto extends PartialType(
  CreateComplementaryDataUserDto,
) {}
