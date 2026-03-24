import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ImpactAreasScoresComponent } from '../../results/impact_areas_scores_components/entities/impact_areas_scores_component.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('result_impact_area_score')
export class ResultImpactAreaScore extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false,
  })
  result_id!: number;

  @Column({
    name: 'impact_area_score_id',
    type: 'bigint',
    nullable: false,
  })
  impact_area_score_id!: number;

  @ManyToOne(
    () => ImpactAreasScoresComponent,
    (ias) => ias.result_impact_area_scores,
  )
  @JoinColumn({
    name: 'impact_area_score_id',
  })
  impact_area_score!: ImpactAreasScoresComponent;

  @ManyToOne(() => Result, (r) => r.result_impact_area_scores)
  @JoinColumn({
    name: 'result_id',
  })
  result!: Result;
}
