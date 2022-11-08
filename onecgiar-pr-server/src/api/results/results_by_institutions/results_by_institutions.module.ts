import {
  Module,
} from '@nestjs/common';
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { ResultsByInstitutionsController } from './results_by_institutions.controller';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../versions/version.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';

@Module({
  controllers: [ResultsByInstitutionsController],
  providers: [
    ResultsByInstitutionsService,
    ResultByIntitutionsRepository,
    ResultRepository,
    VersionsService,
    VersionRepository,
    HandlersError,
    ResultByInstitutionsByDeliveriesTypeRepository,
    UserRepository
  ],
  imports: [],
  exports: [ResultByIntitutionsRepository],
})
export class ResultsByInstitutionsModule{}
