import { Module } from '@nestjs/common';
import { SharePointService } from './share-point.service';
import { GlobalParameterCacheModule } from '../cache/global-parameter-cache.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [SharePointService],
  exports: [SharePointService, GlobalParameterCacheModule],
  imports: [GlobalParameterCacheModule, HttpModule],
})
export class SharePointModule {}

