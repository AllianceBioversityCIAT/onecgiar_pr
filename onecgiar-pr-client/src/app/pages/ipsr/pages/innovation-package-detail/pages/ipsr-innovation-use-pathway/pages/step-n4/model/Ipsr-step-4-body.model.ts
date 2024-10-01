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
}

export class InstitutionsexpectedinvestmentStep4 {
  institution: Institution = new Institution();
  budget: Budget = new Budget();
  is_active: boolean;
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
}

interface Initiativeexpectedinvestment {
  result_initiative_budget_id: number;
  current_year: string;
  next_year: string;
  is_determined: number;
  obj_result_initiative: any;
}

export class IpsrpictureStep4 {
  link: string;
}
