import {
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Entity,
} from 'typeorm';
import { Ipsr } from '../../entities/ipsr.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('result_ip_result_measures')
export class ResultsByIpInnovationUseMeasure extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_ip_result_measures_id',
    type: 'bigint',
  })
  result_ip_result_measures_id: number;

  @Column({
    name: 'unit_of_measure',
    type: 'text',
    nullable: true,
  })
  unit_of_measure!: string;

  @Column({
    name: 'quantity',
    type: 'bigint',
    nullable: true,
  })
  quantity!: number;

  /**
   * Innovation Use 2026 — new users in this row (IU26-R-11). Stored, never copied across
   * phases: not in any replication insert list, so a rollover leaves it NULL.
   */
  @Column({
    name: 'new_users',
    type: 'int',
    unsigned: true,
    nullable: true,
    default: null,
  })
  new_users: number | null;

  @Column({
    name: 'evidence_link',
    type: 'text',
    nullable: true,
  })
  evidence_link!: string;

  @Column({
    name: 'result_ip_result_id',
    type: 'bigint',
    nullable: false,
  })
  result_ip_result_id: number;

  @ManyToOne(() => Ipsr, (r) => r.obj_result_ip_result_measures)
  @JoinColumn({
    name: 'result_ip_result_id',
  })
  obj_result_ip_result: Ipsr;
}
