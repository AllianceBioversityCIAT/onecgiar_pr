import { Module } from '@nestjs/common';
import { ClarisaPolicyTypesService } from './clarisa-policy-types.service';
import { ClarisaPolicyTypesController } from './clarisa-policy-types.controller';
import { ClarisaPolicyTypeRepository } from './clarisa-policy-types.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaPolicyTypesController],
  providers: [
    ClarisaPolicyTypesService,
    ClarisaPolicyTypeRepository,
    HandlersError,
  ],
  exports: [ClarisaPolicyTypeRepository],
})
export class ClarisaPolicyTypesModule {}
