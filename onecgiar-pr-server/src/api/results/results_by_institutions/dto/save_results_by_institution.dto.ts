export class SaveResultsByInstitutionDto {
    public result_id: number;
    public institutions: institutionsInterface[];
}

interface institutionsInterface{
    institutions_id: number;
    deliveries?: number[];
}