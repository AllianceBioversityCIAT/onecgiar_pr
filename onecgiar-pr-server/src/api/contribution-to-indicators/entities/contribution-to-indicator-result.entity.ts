import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ContributionToIndicator } from './contribution-to-indicator.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('contribution_to_indicator_results')
export class ContributionToIndicatorResult extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'bigint',
    name: 'contribution_to_indicator_id',
  })
  contribution_to_indicator_id: number;

  @Column({
    type: 'bigint',
    name: 'result_id',
  })
  result_id: number;

  //object relations
  @ManyToOne(
    () => ContributionToIndicator,
    (cti) => cti.contribution_to_indicator_result_array,
  )
  @JoinColumn({ name: 'contribution_to_indicator_id' })
  contribution_to_indicator_object: ContributionToIndicator;

  @ManyToOne(() => Result, (r) => r.contribution_to_indicator_result_array)
  @JoinColumn({ name: 'result_id' })
  result_object: Result;
}
