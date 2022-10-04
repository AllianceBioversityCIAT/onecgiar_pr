import { Evidence } from '../evidences/entities/evidence.entity';
export class CreateGeneralInformationResultDto {
    public initiative_id: number;
    public result_type_id: number;
    public result_name: string;
    public result_description: string;
    public gender_tag_id: number;
    public evidence: Evidence[];
}
