export class SaveResultsByInstitutionDto {
    public result_id: number;
    public no_applicable_partner: boolean;
    public institutions: institutionsInterface[];
}

interface institutionsInterface{
    institutions_id: number;
    deliveries?: number[];
}