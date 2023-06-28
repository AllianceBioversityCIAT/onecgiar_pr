export class capdevDto{
    public result_capacity_development_id?: number;
    public male_using: number;
    public female_using: number;
    public capdev_delivery_method_id: number;
    public capdev_term_id: number;
    public institutions: institutionsCapDevInterface[];
    public is_attending_for_organization: boolean;
}

interface institutionsCapDevInterface{
    institutions_id: number;
}