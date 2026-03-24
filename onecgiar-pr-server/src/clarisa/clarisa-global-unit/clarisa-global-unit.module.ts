import { Module } from '@nestjs/common';
import { ClarisaGlobalUnitService } from './clarisa-global-unit.service';
import { ClarisaGlobalUnitController } from './clarisa-global-unit.controller';
import { ClarisaGlobalUnitRepository } from './clarisa-global-unit.repository';
import { ClarisaGlobalUnitLineageRepository } from './clarisa-global-unit-lineage.repository';

@Module({
  controllers: [ClarisaGlobalUnitController],
  providers: [
    ClarisaGlobalUnitService,
    ClarisaGlobalUnitRepository,
    ClarisaGlobalUnitLineageRepository,
  ],
  exports: [ClarisaGlobalUnitRepository, ClarisaGlobalUnitLineageRepository],
})
export class ClarisaGlobalUnitModule {}
