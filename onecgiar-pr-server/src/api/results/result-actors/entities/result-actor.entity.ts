import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Result } from '../../entities/result.entity';
import { ActorType } from './actor-type.entity';
import { ResultInnovSection } from '../../../results-framework-reporting/result_innov_section/entities/result_innov_section.entity';

@Entity('result_actors')
export class ResultActor extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_actors_id',
    type: 'bigint',
  })
  result_actors_id: number;

  @Column({
    name: 'women',
    type: 'bigint',
    nullable: true,
  })
  women!: number;

  @Column({
    name: 'women_youth',
    type: 'bigint',
    nullable: true,
  })
  women_youth!: number;

  @Column({
    name: 'men',
    type: 'bigint',
    nullable: true,
  })
  men!: number;

  @Column({
    name: 'men_youth',
    type: 'bigint',
    nullable: true,
  })
  men_youth!: number;

  @Column({
    name: 'other_actor_type',
    type: 'text',
    nullable: true,
  })
  other_actor_type!: string;

  @Column({
    name: 'sex_and_age_disaggregation',
    type: 'boolean',
    nullable: true,
    default: false,
  })
  sex_and_age_disaggregation: boolean;

  /**
   * P2-3537 — the reporter cannot disaggregate THIS actor row by age, although they can
   * by sex. Distinct from `sex_and_age_disaggregation`, which switches both off at once.
   * Nullable with no default: `false` would state the reporter said age data IS
   * available, when the truth is that they never answered.
   */
  @Column({
    name: 'age_disaggregation_not_available',
    type: 'boolean',
    nullable: true,
  })
  age_disaggregation_not_available: boolean | null;

  /**
   * P2-3537 — the youth / non-youth figures on this row were split 50/50 by the system
   * instead of reported. 🥇 This is what keeps a system estimate from being read as
   * reported data downstream, which the story requires explicitly. Do NOT try to derive
   * it by comparing `women_youth` against half of `women`: a reporter whose real split
   * happens to be half would be recorded as an estimate.
   */
  @Column({
    name: 'youth_split_applied_by_system',
    type: 'boolean',
    nullable: true,
  })
  youth_split_applied_by_system: boolean | null;

  @Column({
    name: 'how_many',
    type: 'bigint',
    nullable: true,
  })
  how_many: number;

  @Column({
    name: 'has_women',
    type: 'boolean',
    nullable: true,
  })
  has_women: boolean;

  @Column({
    name: 'has_women_youth',
    type: 'boolean',
    nullable: true,
  })
  has_women_youth: boolean;

  @Column({
    name: 'has_men',
    type: 'boolean',
    nullable: true,
  })
  has_men: boolean;

  @Column({
    name: 'has_men_youth',
    type: 'boolean',
    nullable: true,
  })
  has_men_youth: boolean;

  @Column({
    name: 'addressing_demands',
    type: 'text',
    nullable: true,
  })
  addressing_demands!: string;

  @ManyToOne(() => ResultInnovSection)
  @JoinColumn({ name: 'section_id' })
  obj_section: ResultInnovSection;

  @Column({
    name: 'section_id',
    type: 'bigint',
    nullable: true,
  })
  section_id?: number;

  // relations

  @Column({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'actor_type_id',
    type: 'bigint',
    nullable: true,
  })
  actor_type_id!: number;

  // object relations

  @ManyToOne(() => Result, (r) => r.obj_result_actor)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result;

  @ManyToOne(() => ActorType, (at) => at.result_actor)
  @JoinColumn({
    name: 'actor_type_id',
  })
  obj_actor_type: ActorType;
}
