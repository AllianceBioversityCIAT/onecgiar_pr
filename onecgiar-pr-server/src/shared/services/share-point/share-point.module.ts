import { Module } from '@nestjs/common';
import { SharePointService } from './share-point.service';
import { GlobalParameterCacheModule } from '../cache/global-parameter-cache.module';

@Module({
  providers: [SharePointService],
  exports: [SharePointService, GlobalParameterCacheModule],
  imports: [GlobalParameterCacheModule],
})
export class SharePointModule {}

