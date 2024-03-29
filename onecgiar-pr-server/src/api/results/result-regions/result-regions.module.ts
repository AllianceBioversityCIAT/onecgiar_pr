import { Module } from '@nestjs/common';
import { ResultRegionsService } from './result-regions.service';
import { ResultRegionsController } from './result-regions.controller';
import { ResultRegionRepository } from './result-regions.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ClarisaGeographicScopeRepository } from '../../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultRepository } from '../result.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../../versioning/versioning.repository';

@Module({
  controllers: [ResultRegionsController],
  providers: [
    ResultRegionsService,
    ResultRegionRepository,
    HandlersError,
    ClarisaGeographicScopeRepository,
    ResultRepository,
    VersionsService,
    VersionRepository,
    ReturnResponse,
  ],
  exports: [ResultRegionRepository, ResultRegionsService],
})
export class ResultRegionsModule {}
