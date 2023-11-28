import { Module } from '@nestjs/common';
import { ClarisaSubnationalScopeService } from './clarisa-subnational-scope.service';
import { ClarisaSubnationalScopeController } from './clarisa-subnational-scope.controller';
import { ClarisaSubnationalScopeRepository } from './clarisa-subnational-scope.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaSubnationalScopeController],
  providers: [
    ClarisaSubnationalScopeService,
    ClarisaSubnationalScopeRepository,
    ReturnResponse,
    HandlersError,
  ],
  exports: [ClarisaSubnationalScopeRepository],
})
export class ClarisaSubnationalScopeModule {}
