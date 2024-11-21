import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ContributionToIndicatorResult } from './contribution-to-indicator-result.entity';
import { ContributionToIndicatorSubmission } from './contribution-to-indicator-submission.entity';

@Entity('contribution_to_indicators')
export class ContributionToIndicator extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'toc_result_id',
    unique: true,
  })
  toc_result_id: string;

  @Column({
    type: 'bigint',
    name: 'achieved_in_2024',
    nullable: true,
  })
  achieved_in_2024: number;

  @Column({
    type: 'text',
    name: 'narrative_achieved_in_2024',
    nullable: true,
  })
  narrative_achieved_in_2024: string;

  //object relations
  @OneToMany(
    () => ContributionToIndicatorResult,
    (ctir) => ctir.contribution_to_indicator_object,
  )
  contribution_to_indicator_result_array: ContributionToIndicatorResult[];
  @OneToMany(
    () => ContributionToIndicatorSubmission,
    (ctis) => ctis.contribution_to_indicator_object,
  )
  contribution_to_indicator_submission_array: ContributionToIndicatorSubmission[];
}
