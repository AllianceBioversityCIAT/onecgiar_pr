import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ipsr } from '../../entities/ipsr.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ClarisaGlobalTarget } from '../../../../clarisa/clarisa-global-target/entities/clarisa-global-target.entity';

@Entity('result_ip_impact_area_target')
export class ResultIpImpactArea extends BaseEntity {
  @PrimaryGeneratedColumn()
  result_ip_eoi_outcome_id: number;

  @Column({
    type: 'bigint',
    name: 'result_by_innovation_package_id',
  })
  result_by_innovation_package_id: number;

  @Column({
    type: 'bigint',
    name: 'impact_area_indicator_id',
  })
  impact_area_indicator_id: number;

  @ManyToOne(() => Ipsr, (i) => i.result_by_innovation_package_id)
  @JoinColumn({
    name: 'result_by_innovation_package_id',
  })
  obj_result_by_innovation_package: Ipsr;

  @ManyToOne(() => ClarisaGlobalTarget, (cia) => cia.targetId)
  @JoinColumn({
    name: 'impact_area_indicator_id',
  })
  obj_impact_area_indicator: ClarisaGlobalTarget;
}
