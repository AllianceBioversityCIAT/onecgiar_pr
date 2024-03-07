import { Module, forwardRef } from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { IpsrController } from './ipsr.controller';
import { NonPooledPackageProjectsModule } from './non-pooled-package-projects/non-pooled-package-projects.module';
import { ResultsPackageCentersModule } from './results-package-centers/results-package-centers.module';
import { ResultsPackageTocResultModule } from './results-package-toc-result/results-package-toc-result.module';
import { ResultsPackageByInitiativesModule } from './results-package-by-initiatives/results-package-by-initiatives.module';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';
import { RouterModule } from '@nestjs/core';
import { IpsrRoutes } from './ipsr.routes';
import { IpsrRepository } from './ipsr.repository';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { ShareResultInnovationPackageRequestModule } from './share-result-innovation-package-request/share-result-innovation-package-request.module';
import { InnovationPathwayModule } from './innovation-pathway/innovation-pathway.module';
import { InnovationPackagingExpertsModule } from './innovation-packaging-experts/innovation-packaging-experts.module';
import { ResultIpMeasuresModule } from './result-ip-measures/result-ip-measures.module';
import { ResultsComplementaryInnovationsModule } from './results-complementary-innovations/results-complementary-innovations.module';
import { ResultsComplementaryInnovationsFunctionsModule } from './results-complementary-innovations-functions/results-complementary-innovations-functions.module';
import { ResultsInnovationPackagesEnablerTypeModule } from './results-innovation-packages-enabler-type/results-innovation-packages-enabler-type.module';
import { ResultsIpInstitutionTypeModule } from './results-ip-institution-type/results-ip-institution-type.module';
import { ResultsIpActorsModule } from './results-ip-actors/results-ip-actors.module';
import { ResultsByIpInnovationUseMeasuresModule } from './results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measures.module';
import { ResultsInnovationPackagesValidationModuleModule } from './results-innovation-packages-validation-module/results-innovation-packages-validation-module.module';
import { AssessedDuringExpertWorkshopModule } from './assessed-during-expert-workshop/assessed-during-expert-workshop.module';
import { ReturnResponse } from '../../shared/handlers/error.utils';
import { ResultsInvestmentDiscontinuedOptionRepository } from '../results/results-investment-discontinued-options/results-investment-discontinued-options.repository';
import { ResultsInvestmentDiscontinuedOptionsModule } from '../results/results-investment-discontinued-options/results-investment-discontinued-options.module';

@Module({
  controllers: [IpsrController],
  providers: [IpsrService, IpsrRepository, HandlersError, ReturnResponse],
  imports: [
    RouterModule.register(IpsrRoutes),
    ResultInnovationPackageModule,
    ResultsPackageByInitiativesModule,
    ResultsPackageTocResultModule,
    ResultsPackageCentersModule,
    NonPooledPackageProjectsModule,
    ShareResultInnovationPackageRequestModule,
    InnovationPathwayModule,
    InnovationPackagingExpertsModule,
    ResultIpMeasuresModule,
    ResultsComplementaryInnovationsModule,
    ResultsComplementaryInnovationsFunctionsModule,
    ResultsInnovationPackagesEnablerTypeModule,
    ResultsIpInstitutionTypeModule,
    ResultsIpActorsModule,
    ResultsByIpInnovationUseMeasuresModule,
    ResultsInnovationPackagesValidationModuleModule,
    AssessedDuringExpertWorkshopModule,
    forwardRef(() => ResultsInvestmentDiscontinuedOptionsModule)
  ],
  exports: [IpsrRepository, IpsrService],
})
export class IpsrModule {}
