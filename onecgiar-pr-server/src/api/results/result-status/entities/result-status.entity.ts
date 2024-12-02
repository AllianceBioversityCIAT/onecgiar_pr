import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Result } from '../../entities/result.entity';
import { ContributionToIndicatorSubmission } from '../../../contribution-to-indicators/entities/contribution-to-indicator-submission.entity';

@Entity('result_status')
export class ResultStatus {
  @PrimaryGeneratedColumn({
    name: 'result_status_id',
    type: 'bigint',
  })
  result_status_id: number;

  @Column({
    name: 'status_name',
    type: 'text',
    nullable: false,
  })
  status_name: string;

  @Column({
    name: 'status_description',
    type: 'text',
    nullable: true,
  })
  status_description: string;

  @OneToMany(() => Result, (r) => r.obj_status)
  result_status_list: Result[];

  @OneToMany(
    () => ContributionToIndicatorSubmission,
    (ctis) => ctis.status_object,
  )
  contribution_to_indicator_submission_array: ContributionToIndicatorSubmission[];
}
