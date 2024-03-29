import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ipsr } from '../../entities/ipsr.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('result_ip_eoi_outcomes')
export class ResultIpEoiOutcome extends BaseEntity {
  @PrimaryGeneratedColumn()
  result_ip_eoi_outcome_id: number;

  @Column({
    type: 'bigint',
    name: 'result_by_innovation_package_id',
  })
  result_by_innovation_package_id: number;

  @Column({
    type: 'bigint',
    name: 'toc_result_id',
  })
  toc_result_id: number;

  @Column({
    type: 'boolean',
    name: 'contributing_toc',
    default: false,
  })
  contributing_toc: boolean;

  @ManyToOne(() => Ipsr, (i) => i.result_by_innovation_package_id)
  @JoinColumn({
    name: 'result_by_innovation_package_id',
  })
  obj_result_by_innovation_package: Ipsr;
}
