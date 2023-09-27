export class PolicyChangesDto{
    public policy_stage_id: number;
    public policy_type_id: number;
    public amount: number;
    public status_amount: string;
    public linked_innovation_dev: boolean;
    public linked_innovation_use: boolean;
    public institutions: institutionsPCInterface[];
}

interface institutionsPCInterface{
    institutions_id: number;
}