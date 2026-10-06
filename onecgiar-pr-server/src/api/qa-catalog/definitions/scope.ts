// @akili-spec quality-assurance/qa-field-catalog
// DD-3 / DD-8: entity classes whose every column must be catalogued (bound to a field, or listed in
// NOT_FOR_QA / PENDING_CATALOG). Each per-type task (QAC-T-8..11) adds its tables together with its fields.
import { Result } from '../../results/entities/result.entity';
import { ResultImpactAreaScore } from '../../result-impact-area-scores/entities/result-impact-area-score.entity';
import { ResultsTocResult } from '../../results/results-toc-results/entities/results-toc-result.entity';
import { ResultsTocResultIndicators } from '../../results/results-toc-results/entities/results-toc-results-indicators.entity';
import { ResultIndicatorTarget } from '../../results/results-toc-results/entities/result-toc-result-target-indicators.entity';
import { ResultsCenter } from '../../results/results-centers/entities/results-center.entity';
import { ResultsByInstitution } from '../../results/results_by_institutions/entities/results_by_institution.entity';
import { ResultByInstitutionsByDeliveriesType } from '../../results/result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { ResultsByInititiative } from '../../results/results_by_inititiatives/entities/results_by_inititiative.entity';
import { ResultsByProjects } from '../../results/results_by_projects/entities/results_by_projects.entity';
import { LinkedResult } from '../../results/linked-results/entities/linked-result.entity';
import { ResultRegion } from '../../results/result-regions/entities/result-region.entity';
import { ResultCountry } from '../../results/result-countries/entities/result-country.entity';
import { ResultCountrySubnational } from '../../results/result-countries-sub-national/entities/result-country-subnational.entity';
import { Evidence } from '../../results/evidences/entities/evidence.entity';
import { EvidenceSharepoint } from '../../results/evidences/entities/evidence-sharepoint.entity';
import { ResultsInvestmentDiscontinuedOption } from '../../results/results-investment-discontinued-options/entities/results-investment-discontinued-option.entity';
import { ResultInnovationMergeSplit } from '../../results/result-innovation-merge-split/entities/result-innovation-merge-split.entity';

export type EntityClass = new (...args: any[]) => object;

export const CATALOG_SCOPE: EntityClass[] = [
  // QAC-T-8 · common sections
  Result,
  ResultImpactAreaScore,
  ResultsTocResult,
  ResultsTocResultIndicators,
  ResultIndicatorTarget,
  ResultsCenter,
  ResultsByInstitution,
  ResultByInstitutionsByDeliveriesType,
  ResultsByInititiative,
  ResultsByProjects,
  LinkedResult,
  ResultRegion,
  ResultCountry,
  ResultCountrySubnational,
  Evidence,
  EvidenceSharepoint,
  ResultsInvestmentDiscontinuedOption,
  ResultInnovationMergeSplit,
];
