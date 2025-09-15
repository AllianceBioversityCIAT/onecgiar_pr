import { IpsrRoutes } from './ipsr.routes';
import { InnovationPathwayModule } from './innovation-pathway/innovation-pathway.module';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';
import { ResultsPackageTocResultModule } from './results-package-toc-result/results-package-toc-result.module';
import { InnovationPackagingExpertsModule } from './innovation-packaging-experts/innovation-packaging-experts.module';
import { ResultsInnovationPackagesValidationModuleModule } from './results-innovation-packages-validation-module/results-innovation-packages-validation-module.module';
import { ResultsInnovationPackagesEnablerTypeModule } from './results-innovation-packages-enabler-type/results-innovation-packages-enabler-type.module';
import { AssessedDuringExpertWorkshopModule } from './assessed-during-expert-workshop/assessed-during-expert-workshop.module';

describe('IpsrRoutes', () => {
  it('defines expected routes and modules', () => {
    expect(Array.isArray(IpsrRoutes)).toBe(true);
    const byPath: Record<string, any> = Object.fromEntries(
      IpsrRoutes.map((r) => [r.path, r.module]),
    );

    expect(byPath['results-innovation-package']).toBe(
      ResultInnovationPackageModule,
    );
    expect(byPath['contributors']).toBe(ResultsPackageTocResultModule);
    expect(byPath['innovation-pathway']).toBe(InnovationPathwayModule);
    expect(byPath['innovation-packaging-experts']).toBe(
      InnovationPackagingExpertsModule,
    );
    expect(byPath['results-innovation-packages-validation-module']).toBe(
      ResultsInnovationPackagesValidationModuleModule,
    );
    expect(byPath['results-innovation-packages-enabler-type']).toBe(
      ResultsInnovationPackagesEnablerTypeModule,
    );
    expect(byPath['assessed-during-expert-workshop']).toBe(
      AssessedDuringExpertWorkshopModule,
    );
  });
});
