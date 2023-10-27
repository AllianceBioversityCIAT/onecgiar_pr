import { Module } from '@nestjs/common';
import { TocLevelService } from './toc-level.service';
import { TocLevelController } from './toc-level.controller';
import { HandlersError } from '../../shared/handlers/error.utils';
import { TocLevelRepository } from './toc-level.repository';

@Module({
  controllers: [TocLevelController],
  providers: [TocLevelService, HandlersError, TocLevelRepository],
  exports: [TocLevelRepository],
})
export class TocLevelModule {}
