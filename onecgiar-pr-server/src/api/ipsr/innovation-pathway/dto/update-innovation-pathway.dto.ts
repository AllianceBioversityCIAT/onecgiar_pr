import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { CreateInnovationPackagingExpertDto } from '../../innovation-packaging-experts/dto/create-innovation-packaging-expert.dto';
export class UpdateInnovationPathwayDto {
    public result_id: number;
    public geo_scope_id: number;
    public title: string;
    public experts: CreateInnovationPackagingExpertDto[];
    public result_ip: ResultInnovationPackage;
    public regions: regionsInterface[];
    public countries: countriesInterface[];
    public institutions: institutionsInterface[]
}
export interface regionsInterface {
    id: number;
    name: string;
}
export interface countriesInterface {
    id: number;
    name: string;
}

interface institutionsInterface {
    institutions_id: number;
    deliveries?: number[];
  }