import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaCgiarEntityTypeDto } from './create-clarisa-cgiar-entity-type.dto';

export class UpdateClarisaCgiarEntityTypeDto extends PartialType(CreateClarisaCgiarEntityTypeDto) {}
