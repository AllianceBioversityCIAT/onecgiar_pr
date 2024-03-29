import {
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Entity,
} from 'typeorm';
import { Ipsr } from '../../entities/ipsr.entity';
import { ActorType } from '../../../results/result-actors/entities/actor-type.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('result_ip_result_actors')
export class ResultsIpActor extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_ip_actors_id',
    type: 'bigint',
  })
  result_ip_actors_id: number;

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
    name: 'result_ip_result_id',
    type: 'bigint',
    nullable: false,
  })
  result_ip_result_id: number;

  @Column({
    name: 'actor_type_id',
    type: 'bigint',
    nullable: true,
  })
  actor_type_id!: number;

  @Column({
    name: 'other_actor_type',
    type: 'text',
    nullable: true,
  })
  other_actor_type!: string;

  @Column({
    name: 'evidence_link',
    type: 'text',
    nullable: true,
  })
  evidence_link!: string;

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

  @ManyToOne(() => Ipsr, (ir) => ir.obj_result_ip_actors)
  @JoinColumn({
    name: 'result_ip_result_id',
  })
  obj_result_ip_result_id: Ipsr;

  @ManyToOne(() => ActorType, (at) => at.result_ip_actor)
  @JoinColumn({
    name: 'actor_type_id',
  })
  obj_actor_type: ActorType;
}
