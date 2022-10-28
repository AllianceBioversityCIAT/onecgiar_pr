import { Module } from '@nestjs/common';
import { ClarisaGeographicScopesService } from './clarisa-geographic-scopes.service';
import { ClarisaGeographicScopesController } from './clarisa-geographic-scopes.controller';

@Module({
  controllers: [ClarisaGeographicScopesController],
  providers: [ClarisaGeographicScopesService]
})
export class ClarisaGeographicScopesModule {}
