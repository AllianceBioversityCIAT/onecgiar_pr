import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ImpactLevelController } from './impact-level.controller';
import { ImpactLevelService } from './impact-level.service';
import { ImpactLevelSearchService } from './impact-level-search.service';
import { VersioningModule } from '../../versioning/versioning.module';
import { ImpactLevelSearchRepository } from './repositories/impact-level-search.repository';
import { ImpactLevelCountsRepository } from './repositories/impact-level-counts.repository';
import { ImpactStudyType } from './entities/impact-study-type.entity';
import { ResultImpactLevel } from './entities/result-impact-level.entity';
import { ResultImpactPreviousResult } from './entities/result-impact-previous-result.entity';
import { ResultImpactLevelRepository } from './repositories/result-impact-level.repository';
import { ResultImpactPreviousResultRepository } from './repositories/result-impact-previous-result.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImpactStudyType,
      ResultImpactLevel,
      ResultImpactPreviousResult,
    ]),
    VersioningModule,
  ],
  controllers: [ImpactLevelController],
  providers: [
    ImpactLevelService,
    ImpactLevelSearchService,
    HandlersError,
    ImpactLevelSearchRepository,
    ImpactLevelCountsRepository,
    ResultImpactLevelRepository,
    ResultImpactPreviousResultRepository,
  ],
  exports: [
    ImpactLevelService,
    ResultImpactLevelRepository,
    ResultImpactPreviousResultRepository,
  ],
})
export class ImpactLevelModule {}
