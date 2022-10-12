import { Module } from '@nestjs/common';
import { ClarisaRegionTypesService } from './clarisa-region-types.service';
import { ClarisaRegionTypesController } from './clarisa-region-types.controller';
import { ClarisaRegionsTypeRepository } from './ClariasaRegionsTypes.repository';

@Module({
  controllers: [ClarisaRegionTypesController],
  providers: [
    ClarisaRegionTypesService,
    ClarisaRegionsTypeRepository
  ],
  exports: [
    ClarisaRegionsTypeRepository
  ]
})
export class ClarisaRegionTypesModule {}
