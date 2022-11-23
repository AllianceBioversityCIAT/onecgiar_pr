export class PolicyChangesDto{
    public policy_stage_id: number;
    public policy_type_id: number;
    public amount: number;
    public status_amount: string;
    public institutions: institutionsPCInterface[];
}

interface institutionsPCInterface{
    institutions_id: number;
}