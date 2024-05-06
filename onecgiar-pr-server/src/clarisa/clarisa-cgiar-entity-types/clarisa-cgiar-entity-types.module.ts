import { Module } from '@nestjs/common';
import { ClarisaCgiarEntityTypesService } from './clarisa-cgiar-entity-types.service';
import { ClarisaCgiarEntityTypesController } from './clarisa-cgiar-entity-types.controller';
import { ClarisaCgiarEntityTypeRepository } from './clarisa-cgiar-entity-types.repository';

@Module({
  controllers: [ClarisaCgiarEntityTypesController],
  providers: [ClarisaCgiarEntityTypesService, ClarisaCgiarEntityTypeRepository],
  exports: [ClarisaCgiarEntityTypeRepository],
})
export class ClarisaCgiarEntityTypesModule {}
