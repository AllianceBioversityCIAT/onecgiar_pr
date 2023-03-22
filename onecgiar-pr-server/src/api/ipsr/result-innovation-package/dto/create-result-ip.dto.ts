import { ResultInnovationPackage } from '../entities/result-innovation-package.entity';
import { CreateInnovationPackagingExpertDto } from '../../innovation-packaging-experts/dto/create-innovation-packaging-expert.dto';
export class CreateResultIPDto {
    
    public experts_is_diverse!: boolean;
    public is_not_diverse_justification!: string; 
    public consensus_initiative_work_package!: number;
    public relevant_country!: number;
    public regional_leadership!: number;
    public regional_integrated!: number;
    public active_backstopping!: number;
}
