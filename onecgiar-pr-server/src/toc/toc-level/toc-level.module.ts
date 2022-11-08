import { Module } from '@nestjs/common';
import { TocLevelService } from './toc-level.service';
import { TocLevelController } from './toc-level.controller';

@Module({
  controllers: [TocLevelController],
  providers: [TocLevelService]
})
export class TocLevelModule {}
