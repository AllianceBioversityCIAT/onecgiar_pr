import { Module } from '@nestjs/common';
import { ClarisaActionAreasService } from './clarisa-action-areas.service';
import { ClarisaActionAreasController } from './clarisa-action-areas.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaActionAreasRoutes } from './clarisaActionArea.routes';
import { ClariasaActionAreaRepository } from './ClariasaActionArea.repository';

@Module({
  controllers: [ClarisaActionAreasController],
  providers: [
    ClarisaActionAreasService,
    ClariasaActionAreaRepository
  ],
  imports: [
    RouterModule.register(ClarisaActionAreasRoutes)
  ],
  exports: [
    ClariasaActionAreaRepository
  ]
})
export class ClarisaActionAreasModule {}
