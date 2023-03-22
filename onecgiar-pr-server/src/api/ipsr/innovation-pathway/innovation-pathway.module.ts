import { Module } from '@nestjs/common';
import { InnovationPathwayService } from './innovation-pathway.service';
import { InnovationPathwayController } from './innovation-pathway.controller';
import { ResultRepository } from '../../../api/results/result.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegionRepository } from '../../../api/results/result-regions/result-regions.repository';
import { ResultCountryRepository } from '../../../api/results/result-countries/result-countries.repository';
import { ExpertisesRepository } from '../innovation-packaging-experts/repositories/expertises.repository';
import { InnovationPackagingExpertRepository } from '../innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultInnovationPackageRepository } from '../result-innovation-package/repositories/result-innovation-package.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersionRepository } from 'src/api/results/versions/version.repository';
import { IpsrRepository } from '../ipsr.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';

@Module({
  controllers: [InnovationPathwayController],
  providers: [
    InnovationPathwayService,
    HandlersError,
    ResultRepository,
    ResultRegionRepository,
    ResultCountryRepository,
    ExpertisesRepository, 
    InnovationPackagingExpertRepository,
    ResultInnovationPackageRepository,
    VersionsService,
    VersionRepository,
    IpsrRepository,
    ResultByIntitutionsRepository,
    ResultByInstitutionsByDeliveriesTypeRepository
  ]
})
export class InnovationPathwayModule { }
