import { PartialType } from "@nestjs/swagger";
import { NonPooledProjectBudget } from "../../../results/result_budget/entities/non_pooled_proyect_budget.entity";
import { ResultInitiativeBudget } from "../../../results/result_budget/entities/result_initiative_budget.entity";
import { ResultInstitutionsBudget } from "../../../results/result_budget/entities/result_institutions_budget.entity";
import { ResultsByInstitution } from "../../../results/results_by_institutions/entities/results_by_institution.entity";

export class IpsrSaveStepFour {
  ipsr_pictures: IpsrPictures[];
  ipsr_materials: IpsrMaterials[];
  initiative_expected_investment: ResultInitiativeBudget[];
  initiative_unit_time_id: number;
  initiative_expected_time: string;
  bilateral_expected_investment: NonPooledProjectBudget[];
  bilateral_unit_time_id: number;
  bilateral_expected_time: string;
  institutions_expected_investment: ResultInstitutionsBudget[];
  partner_unit_time_id: number;
  partner_expected_time: string;
  has_scaling_studies: boolean;
  scaling_studies_urls: string[];
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

export interface donorInterfaceToc {
  id: number;
  funder: number;
  grant_title: string;
  center_grant_id: string;
  lead_center: string;
}