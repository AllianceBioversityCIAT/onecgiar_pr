import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ipsr } from '../../entities/ipsr.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ClarisaActionAreaOutcome } from '../../../../clarisa/clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';

@Entity('result_ip_action_area_outcome')
export class ResultIpAAOutcome extends BaseEntity {
  @PrimaryGeneratedColumn()
  result_ip_action_area_outcome_id: number;

  @Column({
    type: 'bigint',
    name: 'result_by_innovation_package_id',
  })
  result_by_innovation_package_id: number;

  @Column({
    type: 'bigint',
    name: 'action_area_outcome_id',
  })
  action_area_outcome_id: number;

  @ManyToOne(() => Ipsr, (i) => i.result_by_innovation_package_id)
  @JoinColumn({
    name: 'result_by_innovation_package_id',
  })
  obj_result_by_innovation_package: Ipsr;

  @ManyToOne(() => ClarisaActionAreaOutcome, (caao) => caao.actionAreaId)
  @JoinColumn({
    name: 'action_area_outcome_id',
  })
  obj_action_area_outcome_innovation_package: ClarisaActionAreaOutcome;
}
