import { Module } from '@nestjs/common';
import { ClarisaRegionsService } from './clarisa-regions.service';
import { ClarisaRegionsController } from './clarisa-regions.controller';
import { ClarisaRegionsRepository } from './ClariasaRegions.repository';

@Module({
  controllers: [ClarisaRegionsController],
  providers: [
    ClarisaRegionsService,
    ClarisaRegionsRepository
  ],
  exports: [
    ClarisaRegionsRepository
  ]
})
export class ClarisaRegionsModule {}
