import { ResultInnovationPackage } from '../entities/result-innovation-package.entity';
import { CreateInnovationPackagingExpertDto } from '../../innovation-packaging-experts/dto/create-innovation-packaging-expert.dto';
export class CreateResultInnovationPackageDto {
    public result_id: number;
    public initiative_id: number;
    public geo_scope_id: number;
    public result_innocation_package: ResultInnovationPackage;
    public regions: regionsInterface[];
    public countries: countriesInterface[];
}
export interface regionsInterface {
    id: number;
    name: string;
}
export interface countriesInterface {
    id: number;
    name: string;
}
