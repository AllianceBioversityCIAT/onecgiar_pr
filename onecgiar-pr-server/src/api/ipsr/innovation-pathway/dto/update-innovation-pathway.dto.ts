import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { CreateInnovationPackagingExpertDto } from '../../innovation-packaging-experts/dto/create-innovation-packaging-expert.dto';
export class UpdateInnovationPathwayDto {
    public result_id: number;
    public geo_scope_id: number;
    public result_by_innovation_package_id: number;
    public title: string;
    public experts: CreateInnovationPackagingExpertDto[];
    public result_ip: ResultInnovationPackage;
    public regions: regionsInterface[];
    public countries: countriesInterface[];
    public institutions: institutionsInterface[]
    public sdgTargets: sdgTargetsInterface[]
}
export interface regionsInterface {
    id: number;
    name: string;
}
export interface countriesInterface {
    id: number;
    name: string;
}
export interface sdgTargetsInterface {
    clarisa_sdg_usnd_code: number;
    clarisa_sdg_target_id: number;
}
interface institutionsInterface {
    institutions_id: number;
    deliveries?: number[];
}