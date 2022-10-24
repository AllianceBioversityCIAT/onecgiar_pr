import { Module } from '@nestjs/common';
import { ClarisaInnovationTypeService } from './clarisa-innovation-type.service';
import { ClarisaInnovationTypeController } from './clarisa-innovation-type.controller';
import { ClarisaInnovationTypeRepository } from './clarisa-innovation-type.repository';

@Module({
  controllers: [ClarisaInnovationTypeController],
  providers: [
    ClarisaInnovationTypeService,
    ClarisaInnovationTypeRepository
  ],
  exports: [
    ClarisaInnovationTypeRepository
  ]
})
export class ClarisaInnovationTypeModule {}
