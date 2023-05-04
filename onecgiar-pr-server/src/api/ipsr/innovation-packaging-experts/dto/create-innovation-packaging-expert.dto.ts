import { ResultIpExpertises } from "../entities/result_ip_expertises.entity";
export class CreateInnovationPackagingExpertDto {
    public result_ip_expert_id: number;
    public first_name: string;
    public last_name: string;
    public email: string;
    public organization_id: number;
    public expertises_id: number;
    public is_active: boolean;
    public expertises: ResultIpExpertises[];
}
