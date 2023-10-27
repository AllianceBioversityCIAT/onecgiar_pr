import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ComplementaryInnovationEnablerTypes } from './complementary-innovation-enabler-types.entity';
import { Ipsr } from '../../entities/ipsr.entity';

@Entity('results_innovatio_packages_enabler_type')
export class ResultsInnovationPackagesEnablerType extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'results_innovatio_packages_enabler_type_id',
    type: 'bigint',
  })
  results_innovatio_packages_enabler_type_id: number;

  @Column({
    name: 'result_by_innovation_package_id',
    type: 'bigint',
    nullable: false,
  })
  result_by_innovation_package_id: number;

  @Column({
    name: 'complementary_innovation_enable_type_id',
    type: 'bigint',
    nullable: false,
  })
  complementary_innovation_enable_type_id: number;

  @ManyToOne(
    () => ComplementaryInnovationEnablerTypes,
    (ciet) => ciet.complementary_innovation_enabler_types_id,
  )
  @JoinColumn({
    name: 'complementary_innovation_enable_type_id',
  })
  obj_complementary_innovation_enable_type: ComplementaryInnovationEnablerTypes;

  @ManyToOne(() => Ipsr, (ipsr) => ipsr.result_by_innovation_package_id)
  @JoinColumn({
    name: 'result_by_innovation_package_id',
  })
  obj_result_by_innovation_package: Ipsr;
}
