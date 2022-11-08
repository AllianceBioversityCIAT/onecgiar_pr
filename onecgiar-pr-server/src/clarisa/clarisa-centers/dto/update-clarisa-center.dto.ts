import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaCenterDto } from './create-clarisa-center.dto';

export class UpdateClarisaCenterDto extends PartialType(CreateClarisaCenterDto) {}
