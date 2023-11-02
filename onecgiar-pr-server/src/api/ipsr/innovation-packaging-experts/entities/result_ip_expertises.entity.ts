import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Expertises } from './expertises.entity';
import { InnovationPackagingExpert } from './innovation-packaging-expert.entity';

@Entity('result_ip_expertises')
export class ResultIpExpertises extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_ip_expertises_id',
    type: 'bigint',
  })
  result_ip_expertises_id: number;

  @Column({
    name: 'result_ip_expert_id',
    type: 'bigint',
  })
  result_ip_expert_id: number;

  @Column({
    name: 'expertises_id',
    type: 'bigint',
  })
  expertises_id: number;

  @ManyToOne(() => InnovationPackagingExpert, (rip) => rip.expertises)
  @JoinColumn({
    name: 'result_ip_expert_id',
  })
  obj_result_ip_expert: InnovationPackagingExpert;

  @ManyToOne(() => Expertises, (e) => e.expertises_id)
  @JoinColumn({
    name: 'expertises_id',
  })
  obj_expertises: Expertises;
}
