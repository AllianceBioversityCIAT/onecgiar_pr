import { ResultIpMeasure } from "../../../ipsr/result-ip-measures/entities/result-ip-measure.entity";
import { ResultActor } from "../../../results/result-actors/entities/result-actor.entity";
import { ResultsByInstitutionType } from "../../../results/results_by_institution_types/entities/results_by_institution_type.entity";

export interface CreateInnovationUseDto {
    has_innovation_link: boolean;
    linked_results: number[];
    innovation_readiness_level_id: number;
    readiness_level_explanation: string;
    has_scaling_studies: boolean;
    scaling_studies_urls: string[];
    actors: ResultActor[];
    organization: ResultsByInstitutionType[];
    measures: ResultIpMeasure[];
}
