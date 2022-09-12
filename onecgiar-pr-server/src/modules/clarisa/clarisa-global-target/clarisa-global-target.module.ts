import { Module } from '@nestjs/common';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';
import { ClarisaGlobalTargetController } from './clarisa-global-target.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaGlobalTargetRoutes } from './clarisaGlobalTarget.routes';

@Module({
  controllers: [ClarisaGlobalTargetController],
  providers: [ClarisaGlobalTargetService],
  imports: [RouterModule.register(ClarisaGlobalTargetRoutes)],
})
export class ClarisaGlobalTargetModule {}
