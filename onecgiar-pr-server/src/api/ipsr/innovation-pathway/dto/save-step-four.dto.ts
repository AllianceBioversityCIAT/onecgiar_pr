export class SaveStepFour {
    ipsr_pictures:  IpsrPictures[];
    ipsr_materials:  IpsrMaterials[];
    link_workshop_list: string;
    initiative_expected_investment: InitiativeExpectedInvestment[];
    initiative_unit_time_id: number;
    initiative_expected_time: string;
    bilateral_expected_investment: BilateralExpectedInvestment[];
    bilateral_unit_time_id: number;
    bilateral_expected_time: string;
    institutions_expected_investment: InstitutionsExpectedInvestment[];
    partner_unit_time_id: number;
    partner_expected_time: string;
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
}
export interface BilateralExpectedInvestment {
    npp_id: number;
    current_year: number;
    next_year: number;
    is_determined: boolean;
}
export interface InstitutionsExpectedInvestment {
    rbi_id: number;
    current_year: number;
    next_year: number;
    is_determined: boolean;
}