import { Module } from '@nestjs/common';
import { ClarisaRegionTypesService } from './clarisa-region-types.service';
import { ClarisaRegionTypesController } from './clarisa-region-types.controller';

@Module({
  controllers: [ClarisaRegionTypesController],
  providers: [ClarisaRegionTypesService]
})
export class ClarisaRegionTypesModule {}
