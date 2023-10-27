import { Module } from '@nestjs/common';
import { TocResultsModule } from './toc-results/toc-results.module';
import { TocLevelModule } from './toc-level/toc-level.module';

@Module({
  imports: [TocResultsModule, TocLevelModule],
  controllers: [],
  providers: [],
  exports: [TocResultsModule, TocLevelModule],
})
export class TocModule {}
