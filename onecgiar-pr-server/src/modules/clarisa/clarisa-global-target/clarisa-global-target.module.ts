import { Module } from '@nestjs/common';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';
import { ClarisaGlobalTargetController } from './clarisa-global-target.controller';

@Module({
  controllers: [ClarisaGlobalTargetController],
  providers: [ClarisaGlobalTargetService]
})
export class ClarisaGlobalTargetModule {}
