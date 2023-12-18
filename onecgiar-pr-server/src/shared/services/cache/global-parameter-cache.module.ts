import { Module } from '@nestjs/common';
import { GlobalParameterCacheService } from './global-parameter-cache.service';
import { GlobalParameterModule } from '../../../api/global-parameter/global-parameter.module';

@Module({
  providers: [GlobalParameterCacheService],
  exports: [GlobalParameterCacheService],
  imports: [GlobalParameterModule],
})
export class GlobalParameterCacheModule {}

