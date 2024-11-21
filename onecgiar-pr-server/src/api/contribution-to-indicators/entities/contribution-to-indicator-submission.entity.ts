import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ContributionToIndicator } from './contribution-to-indicator.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { ResultStatus } from '../../results/result-status/entities/result-status.entity';

@Entity('contribution_to_indicator_submissions')
export class ContributionToIndicatorSubmission extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  //relations
  @Column({
    type: 'bigint',
    name: 'contribution_to_indicator_id',
  })
  contribution_to_indicator_id: number;

  @Column({
    type: 'bigint',
    name: 'user_id',
  })
  user_id: number;

  @Column({
    type: 'bigint',
    name: 'status_id',
  })
  status_id: number;

  //object relations
  @ManyToOne(
    () => ContributionToIndicator,
    (cti) => cti.contribution_to_indicator_submission_array,
  )
  @JoinColumn({ name: 'contribution_to_indicator_id' })
  contribution_to_indicator_object: ContributionToIndicator;

  @ManyToOne(() => User, (u) => u.contribution_to_indicator_submission_array)
  @JoinColumn({ name: 'user_id' })
  user_object: User;

  @ManyToOne(
    () => ResultStatus,
    (rs) => rs.contribution_to_indicator_submission_array,
  )
  @JoinColumn({ name: 'status_id' })
  status_object: ResultStatus;
}
