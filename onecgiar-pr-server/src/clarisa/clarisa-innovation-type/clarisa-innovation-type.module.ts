import { Module } from '@nestjs/common';
import { ClarisaInnovationTypeService } from './clarisa-innovation-type.service';
import { ClarisaInnovationTypeController } from './clarisa-innovation-type.controller';
import { ClarisaInnovationTypeRepository } from './clarisa-innovation-type.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaInnovationTypeController],
  providers: [
    ClarisaInnovationTypeService,
    ClarisaInnovationTypeRepository,
    HandlersError,
  ],
  exports: [ClarisaInnovationTypeRepository],
})
export class ClarisaInnovationTypeModule {}
