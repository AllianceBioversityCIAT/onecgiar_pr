export class CreateComplementaryInnovationDto {
    public result_code: number;
    public title: string;
    public short_title: string;
    public description: string;
    public other_funcions: string;
    public initiative_id: number;
    public is_active: boolean;
    public complementaryFunctions: ComplementaryFunctionsInterface[];
    public referenceMaterials: ReferenceMaterialsInterface[];
}

export interface ComplementaryFunctionsInterface {
    complementary_innovation_functions_id: number;
}
export interface ReferenceMaterialsInterface {
    link: string;
}