import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Expertises } from './expertises.entity';
import { ClarisaInstitution } from '../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity';
import { Result } from '../../../results/entities/result.entity';
import { ResultIpExpertises } from './result_ip_expertises.entity';

@Entity('result_ip_expert')
export class InnovationPackagingExpert extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_ip_expert_id',
    type: 'bigint',
  })
  result_ip_expert_id: number;

  // ! This field is deprecated, but still used for data consistency
  @Column({
    name: 'first_name',
    type: 'text',
    nullable: true,
  })
  first_name: string;

  // ! This field is deprecated, but still used for data consistency
  @Column({
    name: 'last_name',
    type: 'text',
    nullable: true,
  })
  last_name: string;

  // ! This field is deprecated, but still used for data consistency
  @Column({
    name: 'email',
    type: 'text',
    nullable: true,
  })
  email: string;

  @Column({
    name: 'organization_id',
    type: 'bigint',
    nullable: true,
  })
  organization_id: number;

  @Column({
    name: 'expertises_id',
    type: 'bigint',
    nullable: true,
  })
  expertises_id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @ManyToOne(() => Expertises, (e) => e.expertises_id, { nullable: true })
  @JoinColumn({
    name: 'expertises_id',
  })
  obj_expertises: Expertises;

  @ManyToOne(() => ClarisaInstitution, (ci) => ci.id)
  @JoinColumn({
    name: 'organization_id',
  })
  obj_organization: ClarisaInstitution;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result: Result;

  @OneToMany(() => ResultIpExpertises, (ripe) => ripe.obj_result_ip_expert)
  expertises: ResultIpExpertises[];
}
