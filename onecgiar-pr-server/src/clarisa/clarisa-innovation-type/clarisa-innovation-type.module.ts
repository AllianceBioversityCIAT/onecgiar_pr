import { Module } from '@nestjs/common';
import { ClarisaInnovationTypeService } from './clarisa-innovation-type.service';
import { ClarisaInnovationTypeController } from './clarisa-innovation-type.controller';

@Module({
  controllers: [ClarisaInnovationTypeController],
  providers: [ClarisaInnovationTypeService]
})
export class ClarisaInnovationTypeModule {}
