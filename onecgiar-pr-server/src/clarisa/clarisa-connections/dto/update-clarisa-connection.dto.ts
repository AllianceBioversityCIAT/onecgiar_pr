import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaConnectionDto } from './create-clarisa-connection.dto';

export class UpdateClarisaConnectionDto extends PartialType(
  CreateClarisaConnectionDto,
) {}
