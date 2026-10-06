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
import { ResultsKnowledgeProduct } from '../../results/results-knowledge-products/entities/results-knowledge-product.entity';
import { ResultsKnowledgeProductMetadata } from '../../results/results-knowledge-products/entities/results-knowledge-product-metadata.entity';
import { ResultsKnowledgeProductAuthor } from '../../results/results-knowledge-products/entities/results-knowledge-product-authors.entity';
import { ResultsKnowledgeProductKeyword } from '../../results/results-knowledge-products/entities/results-knowledge-product-keywords.entity';
import { ResultsKnowledgeProductAltmetric } from '../../results/results-knowledge-products/entities/results-knowledge-product-altmetrics.entity';
import { ResultsKnowledgeProductFairScore } from '../../results/results-knowledge-products/entities/results-knowledge-product-fair-scores.entity';
import { ResultInitiativeBudget } from '../../results/result_budget/entities/result_initiative_budget.entity';
import { NonPooledProjectBudget } from '../../results/result_budget/entities/non_pooled_proyect_budget.entity';
import { ResultInstitutionsBudget } from '../../results/result_budget/entities/result_institutions_budget.entity';
import { ResultsCapacityDevelopments } from '../../results/summary/entities/results-capacity-developments.entity';
import { ResultsInnovationsDev } from '../../results/summary/entities/results-innovations-dev.entity';
import { ResultAnswer } from '../../results/result-questions/entities/result-answers.entity';
import { ResultInnovationMergeSplit } from '../../results/result-innovation-merge-split/entities/result-innovation-merge-split.entity';
import { ResultsPolicyChanges } from '../../results/summary/entities/results-policy-changes.entity';
import { ResultsInnovationsUse } from '../../results/summary/entities/results-innovations-use.entity';
import { ResultActor } from '../../results/result-actors/entities/result-actor.entity';
import { ResultsByInstitutionType } from '../../results/results_by_institution_types/entities/results_by_institution_type.entity';
import { ResultIpMeasure } from '../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultScalingStudyUrl } from '../../results-framework-reporting/result_scaling_study_urls/entities/result_scaling_study_url.entity';
import { ResultInnovationPackage } from '../../ipsr/result-innovation-package/entities/result-innovation-package.entity';
import { Ipsr } from '../../ipsr/entities/ipsr.entity';
import { ResultIpEoiOutcome } from '../../ipsr/innovation-pathway/entities/result-ip-eoi-outcome.entity';
import { ResultIpExpertWorkshopOrganized } from '../../ipsr/innovation-pathway/entities/result-ip-expert-workshop-organized.entity';
import { ResultsIpActor } from '../../ipsr/results-ip-actors/entities/results-ip-actor.entity';
import { ResultsIpInstitutionType } from '../../ipsr/results-ip-institution-type/entities/results-ip-institution-type.entity';
import { ResultsByIpInnovationUseMeasure } from '../../ipsr/results-by-ip-innovation-use-measures/entities/results-by-ip-innovation-use-measure.entity';
import { ResultsComplementaryInnovation } from '../../ipsr/results-complementary-innovations/entities/results-complementary-innovation.entity';
import { ResultsComplementaryInnovationsFunction } from '../../ipsr/results-complementary-innovations-functions/entities/results-complementary-innovations-function.entity';
import { ResultsInnovationPackagesEnablerType } from '../../ipsr/results-innovation-packages-enabler-type/entities/results-innovation-packages-enabler-type.entity';

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
  // QAC-T-9 · output types (knowledge product, capacity sharing, innovation development)
  ResultsKnowledgeProduct,
  ResultsKnowledgeProductMetadata,
  ResultsKnowledgeProductAuthor,
  ResultsKnowledgeProductKeyword,
  ResultsKnowledgeProductAltmetric,
  ResultsKnowledgeProductFairScore,
  ResultInitiativeBudget,
  ResultInstitutionsBudget,
  NonPooledProjectBudget,
  ResultsCapacityDevelopments,
  ResultsInnovationsDev,
  ResultAnswer,
  // QAC-T-10 · outcome and impact types (policy change, innovation use; other outcome and impact contribution own no table)
  ResultsPolicyChanges,
  ResultsInnovationsUse,
  ResultActor,
  ResultsByInstitutionType,
  ResultIpMeasure,
  ResultScalingStudyUrl,
  // QAC-T-11 · innovation package (IPSR). `result_ip_step_three_evidence` has no entity, so it cannot be listed here
  // (known gap, see the header of pending-catalog.ts).
  ResultInnovationPackage,
  Ipsr,
  ResultIpEoiOutcome,
  ResultIpExpertWorkshopOrganized,
  ResultsIpActor,
  ResultsIpInstitutionType,
  ResultsByIpInnovationUseMeasure,
  ResultsComplementaryInnovation,
  ResultsComplementaryInnovationsFunction,
  ResultsInnovationPackagesEnablerType,
];
