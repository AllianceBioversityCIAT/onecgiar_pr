import { Module } from '@nestjs/common';
import { InnovationPathwayService } from './innovation-pathway.service';
import { InnovationPathwayController } from './innovation-pathway.controller';
import { ResultRepository } from '../../../api/results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../../api/results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../../api/results/result-countries/result-countries.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersionRepository } from 'src/api/results/versions/version.repository';

@Module({
  controllers: [InnovationPathwayController],
  providers: [
    InnovationPathwayService,
    HandlersError,
    ResultRepository,
    ResultRegionRepository,
    ResultCountryRepository
    VersionsService,
    VersionRepository
  ]
})
export class InnovationPathwayModule { }
