import { ResultsByInstitution } from '../../../results/results_by_institutions/entities/results_by_institution.entity';
import { PartialType } from '@nestjs/mapped-types';
import { ResultInstitutionsBudget } from '../../../results/result_budget/entities/result_institutions_budget.entity';
export class SaveStepFour {
  ipsr_pictures: IpsrPictures[];
  ipsr_materials: IpsrMaterials[];
  initiative_expected_investment: InitiativeExpectedInvestment[];
  initiative_unit_time_id: number;
  initiative_expected_time: string;
  bilateral_expected_investment: BilateralExpectedInvestment[];
  bilateral_unit_time_id: number;
  bilateral_expected_time: string;
  institutions_expected_investment: ResultInstitutionsBudget[];
  partner_unit_time_id: number;
  partner_expected_time: string;
}

export class InstitutionsInterface extends PartialType(ResultsByInstitution) {
  deliveries?: number[];
}

export interface IpsrPictures {
  link: string;
}
export interface IpsrMaterials {
  link: string;
}
export interface InitiativeExpectedInvestment {
  initiative_id: number;
  current_year: number;
  next_year: number;
  is_determined: boolean;
  result_initiative_id: number;
}
export interface BilateralExpectedInvestment {
  non_pooled_projetct_id: number;
  is_active: boolean;
  in_kind: number;
  in_cash: number;
  is_determined: boolean;
}
export interface InstitutionsExpectedInvestment {
  rbi_id: number;
  current_year: number;
  next_year: number;
  is_determined: boolean;
}

export interface donorInterfaceToc {
  id: number;
  funder: number;
  grant_title: string;
  center_grant_id: string;
  lead_center: string;
}
