import { returnFormatService } from '../../../../shared/extendsGlobalDTO/returnServices.dto';
import { ImpactAreasScoresComponent } from '../entities/impact_areas_scores_component.entity';

export class returnFormatImpactAreasScoresComponent extends returnFormatService {
  public response!: ImpactAreasScoresComponent | ImpactAreasScoresComponent[];
}
