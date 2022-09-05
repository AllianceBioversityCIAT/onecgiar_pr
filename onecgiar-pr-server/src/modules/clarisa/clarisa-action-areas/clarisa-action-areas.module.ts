import { Module } from '@nestjs/common';
import { ClarisaActionAreasService } from './clarisa-action-areas.service';
import { ClarisaActionAreasController } from './clarisa-action-areas.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaActionAreasRoutes } from './clarisaActionArea.routes';

@Module({
  controllers: [ClarisaActionAreasController],
  providers: [ClarisaActionAreasService],
  imports: [
    RouterModule.register(ClarisaActionAreasRoutes)
  ]
})
export class ClarisaActionAreasModule {}
