import { Module } from '@nestjs/common';
import { ClarisaRegionsCgiarService } from './clarisa-regions-cgiar.service';
import { ClarisaRegionsCgiarController } from './clarisa-regions-cgiar.controller';

@Module({
  controllers: [ClarisaRegionsCgiarController],
  providers: [ClarisaRegionsCgiarService]
})
export class ClarisaRegionsCgiarModule {}
