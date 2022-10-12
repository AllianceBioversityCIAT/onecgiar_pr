import { Module } from '@nestjs/common';
import { ClarisaRegionsService } from './clarisa-regions.service';
import { ClarisaRegionsController } from './clarisa-regions.controller';
import { ClarisaRegionsTypesRepository } from './ClariasaRegionsTypes.repository';

@Module({
  controllers: [ClarisaRegionsController],
  providers: [ClarisaRegionsService, ClarisaRegionsTypesRepository],
  exports: [ClarisaRegionsTypesRepository],
})
export class ClarisaRegionsModule {}
