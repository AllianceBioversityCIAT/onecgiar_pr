export class SaveStepFour {
    ipsr_pictures:  IpsrPictures[];
    ipsr_materials:  IpsrMaterials[];
    link_workshop_list: string;
}

export interface IpsrPictures {
    link: string;
}
export interface IpsrMaterials {
    link: string;
}
export interface InitiativeExpectedInvestment {
    result_by_initiative_id: number;
    current_year: number;
    next_year: number;
    is_determinated: number;
}