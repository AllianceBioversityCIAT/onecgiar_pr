import { Module } from '@nestjs/common';
import { ClarisaGlobalTargetService } from './clarisa-global-target.service';
import { ClarisaGlobalTargetController } from './clarisa-global-target.controller';
import { ClarisaGobalTargetRepository } from './ClariasaGlobalTarget.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaGlobalTargetController],
  providers: [ClarisaGlobalTargetService, ClarisaGobalTargetRepository, HandlersError],
  imports: [],
  exports: [ClarisaGobalTargetRepository],
})
export class ClarisaGlobalTargetModule {}
