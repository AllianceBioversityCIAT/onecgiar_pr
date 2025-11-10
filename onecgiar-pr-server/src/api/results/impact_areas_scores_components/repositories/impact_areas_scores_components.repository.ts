import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ImpactAreasScoresComponent } from '../entities/impact_areas_scores_component.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ImpactAreasScoresComponentRepository extends Repository<ImpactAreasScoresComponent> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ImpactAreasScoresComponent, dataSource.createEntityManager());
  }
}
