import { Module } from '@nestjs/common';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';
import { ClarisaGeographicScopesController } from './clarisa-geographic-scopes.controller';
import { ClarisaGeographicScopeRepository } from './clarisa-geographic-scopes.repository';

@Module({
  controllers: [ClarisaGeographicScopesController],
  providers: [ClarisaGeographicScopesService, ClarisaGeographicScopeRepository],
  exports: [
    ClarisaGeographicScopeRepository
  ]
})
export class ClarisaGeographicScopesModule {}
