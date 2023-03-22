import { Module } from '@nestjs/common';
import { ResultRegionsService } from './result-regions.service';
import { ResultRegionsController } from './result-regions.controller';
import { ResultRegionRepository } from './result-regions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ClarisaGeographicScopeRepository } from '../../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.repository';
import { ResultRepository } from '../result.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../versions/version.repository';

@Module({
  controllers: [ResultRegionsController],
  providers: [ResultRegionsService, ResultRegionRepository, HandlersError, ClarisaGeographicScopeRepository, ResultRepository, VersionsService, VersionRepository],
  exports: [
    ResultRegionRepository,
    ResultRegionsService
  ]
})
export class ResultRegionsModule {}
