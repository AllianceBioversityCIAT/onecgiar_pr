import { PartialType } from '@nestjs/mapped-types';
import { CreateClarisaSubnationalScopeDto } from './create-clarisa-subnational-scope.dto';

export class UpdateClarisaSubnationalScopeDto extends PartialType(CreateClarisaSubnationalScopeDto) {}
