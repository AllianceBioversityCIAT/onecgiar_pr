import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { CreateInnovationPackagingExpertDto } from '../../innovation-packaging-experts/dto/create-innovation-packaging-expert.dto';
import { ResultActor } from '../../../results/result-actors/entities/result-actor.entity';
import { ResultByInstitutionsByDeliveriesType } from '../../../results/result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { ResultIpMeasure } from '../../result-ip-measures/entities/result-ip-measure.entity';
export class UpdateInnovationPathwayDto {
    public result_id: number;
    public geo_scope_id: number;
    public title: string;
    public experts: CreateInnovationPackagingExpertDto[];
    public result_ip: ResultInnovationPackage;
    public innovatonUse: innovatonUseInterface;
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

interface innovatonUseInterface {
    actors: ResultActor[],
    organization: ResultByInstitutionsByDeliveriesType[],
    measures: ResultIpMeasure[];
}

interface institutionsInterface {
    institutions_id: number;
    deliveries?: number[];
  }