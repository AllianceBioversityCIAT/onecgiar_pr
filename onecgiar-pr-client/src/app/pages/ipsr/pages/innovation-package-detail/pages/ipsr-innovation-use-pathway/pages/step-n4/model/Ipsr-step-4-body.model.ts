export class IpsrStep4Body {
  ipsr_pictures: IpsrpictureStep4[] = [];
  initiative_expected_investment: Initiativeexpectedinvestment[] = [];
  initiative_unit_time_id: number = null;
  initiative_expected_time: string = null;
  bilateral_expected_investment: BilateralexpectedinvestmentStep4[] = [];
  bilateral_unit_time_id: number = null;
  bilateral_expected_time: string = null;
  institutions_expected_investment: InstitutionsexpectedinvestmentStep4[] = [];
  partner_unit_time_id: number = null;
  partner_expected_time: string = null;
  is_result_ip_published: boolean = null;
  ipsr_pdf_report: string = null;
  ipsr_materials: IPSRMaterialsStep4[] = [];
}

export class InstitutionsexpectedinvestmentStep4 {
  obj_result_institution: any;
  institution: Institution = new Institution();
  budget: Budget = new Budget();
  is_determined: number;
  in_kind: string;
  in_cash: string;
  is_active: boolean;
  kind_cash: string;
}

class Budget {
  result_institutions_budget_id: number;
  in_kind: string;
  in_cash: string;
  is_determined: number;
}

class Institution {
  id: number;
  is_active: boolean;
  deliveries: number[];
  institutions_name: string;
  institutions_type_name: string;
}

export class BilateralexpectedinvestmentStep4 {
  non_pooled_projetct_budget_id: number;
  in_cash: string;
  in_kind: string;
  is_determined: number;
  obj_non_pooled_projetct: any;
  is_active: boolean;
  kind_cash: string;
}

interface Initiativeexpectedinvestment {
  result_initiative_budget_id: number;
  current_year: string;
  next_year: string;
  is_determined: number;
  obj_result_initiative: any;
  kind_cash: string;
}

export class IpsrpictureStep4 {
  link: string;
}

export class IPSRMaterialsStep4 {
  link: string;
}
