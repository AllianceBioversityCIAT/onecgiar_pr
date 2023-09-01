import { ResultIpMeasure } from '../../../ipsr/result-ip-measures/entities/result-ip-measure.entity';
import { ResultActor } from '../../result-actors/entities/result-actor.entity';
import { ResultsByInstitutionType } from '../../results_by_institution_types/entities/results_by_institution_type.entity';

export class InnovationUseDto {
  public result_innovation_use_id?: number;
  public male_using: number;
  public female_using: number;
  public other: otherMeasuresInterface[];
  public innovationUse: innovatonUseInterface;
}

interface otherMeasuresInterface {
  result_innovations_use_measure_id: number;
  unit_of_measure: string;
  quantity: number;
}

export interface innovatonUseInterface {
  actors: ResultActor[];
  organization: ResultsByInstitutionType[];
  measures: ResultIpMeasure[];
}
