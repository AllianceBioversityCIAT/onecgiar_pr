import { Module } from '@nestjs/common';
import { ClarisaRegionsService } from './clarisa-regions.service';
import { ClarisaRegionsController } from './clarisa-regions.controller';
import { ClarisaRegionsRepository } from './ClariasaRegions.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaRegionsController],
  providers: [ClarisaRegionsService, ClarisaRegionsRepository, HandlersError],
  exports: [ClarisaRegionsRepository],
})
export class ClarisaRegionsModule {}
