import { Module } from '@nestjs/common';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';
import { ClarisaGeographicScopesController } from './clarisa-geographic-scopes.controller';
import { ClarisaGeographicScopeRepository } from './clarisa-geographic-scopes.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaGeographicScopesController],
  providers: [ClarisaGeographicScopesService, ClarisaGeographicScopeRepository, HandlersError],
  exports: [
    ClarisaGeographicScopeRepository
  ]
})
export class ClarisaGeographicScopesModule {}
