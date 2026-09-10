import { ResultIpMeasure } from '../../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultActor } from '../../result-actors/entities/result-actor.entity';
import { ResultsByInstitutionType } from '../../results_by_institution_types/entities/results_by_institution_type.entity';
import { InvestmentRowDto } from '../../result_budget/dto/investment-row.dto';

export class InnovationUseDto {
  public result_innovation_use_id?: number;
  public male_using: number;
  public female_using: number;
  public innov_use_to_be_determined?: boolean;
  public innovation_use_level_id?: number;
  public other: otherMeasuresInterface[];
  public innovatonUse: innovatonUseInterface;

  /**
   * P2-3424 — fields the Innovation Use forms (W1/W2 legacy and W3/bilateral) have been sending for a
   * while and this endpoint silently dropped, because they were not declared here and the controller has
   * no `ValidationPipe`. Every one of them already owns storage:
   * `results_innovations_use.{has_scaling_studies, readiness_level_explanation,
   * innov_use_2030_to_be_determined, has_innovation_link}`, `result_scaling_study_urls.study_url`
   * (keyed by `result_innov_use_id`) and `linked_result`.
   *
   * All optional on purpose: the service only writes a field when the caller actually sent the key, so a
   * payload that omits it leaves the stored value untouched.
   */
  public has_scaling_studies?: boolean;
  public scaling_studies_urls?: string[];
  public innov_use_2030_to_be_determined?: boolean;
  public readiness_level_explanation?: string;
  public has_innovation_link?: boolean;
  public linked_results?: (number | string)[];

  /**
   * P2-3390 — the three "Investment (USD)" tables, flat contract (`{ id, kind_cash, is_determined }`),
   * the same one the v2 innovation-use endpoint uses and `app-estimates-cgiar` round-trips. Optional,
   * and an absent key is a no-op: the section save only sends what the open form holds, so an omitted
   * table must never clear stored amounts.
   *
   * The bilateral form sends ONLY these keys — never the legacy `*_expected_investment` ones — which is
   * what keeps the legacy `non_pooled_projetct_id`-based writer out of the picture.
   */
  public investment_programs?: InvestmentRowDto[];
  public investment_bilateral?: InvestmentRowDto[];
  public investment_partners?: InvestmentRowDto[];
}

interface otherMeasuresInterface {
  result_innovations_use_measure_id: number;
  unit_of_measure: string;
  quantity: number;
}

export interface innovatonUseInterface {
  actors: ResultActor[];
  organization: ResultsByInstitutionType[];
  measures: ResultIpMeasure[];
}
