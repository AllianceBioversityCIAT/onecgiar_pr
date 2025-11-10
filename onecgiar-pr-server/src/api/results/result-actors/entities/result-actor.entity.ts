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
