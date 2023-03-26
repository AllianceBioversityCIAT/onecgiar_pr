import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { CreateInnovationPackagingExpertDto } from '../../innovation-packaging-experts/dto/create-innovation-packaging-expert.dto';
import { ResultActor } from '../../../results/result-actors/entities/result-actor.entity';
import { ResultByInstitutionsByDeliveriesType } from '../../../results/result-by-institutions-by-deliveries-type/entities/result-by-institutions-by-deliveries-type.entity';
import { ResultIpMeasure } from '../../result-ip-measures/entities/result-ip-measure.entity';
export class UpdateInnovationPathwayDto {
    public result_id: number;
    public geo_scope_id: number;
    public result_by_innovation_package_id: number;
    public title: string;
    public experts: CreateInnovationPackagingExpertDto[];
    public result_ip: ResultInnovationPackage;
    public innovatonUse: innovatonUseInterface;
    public regions: regionsInterface[];
    public countries: countriesInterface[];
    public institutions: institutionsInterface[]
    public sdgTargets: sdgTargetsInterface[]
    public eoiOutcomes: eoiOutcomesInterface[]
    public actionAreaOutcomes: actionAreaOutcomesInterface[]
}
export interface regionsInterface {
    id: number;
    name: string;
}
export interface countriesInterface {
    id: number;
    name: string;
}
export interface eoiOutcomesInterface {
    toc_result_id: number;
}
export interface actionAreaOutcomesInterface {
    action_area_outcome_id: number;
}
export interface sdgTargetsInterface {
    clarisa_sdg_usnd_code: number;
    clarisa_sdg_target_id: number;
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