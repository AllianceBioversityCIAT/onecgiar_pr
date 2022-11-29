import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaGeographicScopeDto } from './create-clarisa-geographic-scope.dto';

export class UpdateClarisaGeographicScopeDto extends PartialType(CreateClarisaGeographicScopeDto) {}
