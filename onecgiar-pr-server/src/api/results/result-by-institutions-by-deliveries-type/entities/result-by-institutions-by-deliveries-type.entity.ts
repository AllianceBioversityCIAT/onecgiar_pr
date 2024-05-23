import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PartnerDeliveryType } from '../../partner-delivery-type/entities/partner-delivery-type.entity';
import { ResultsByInstitution } from '../../results_by_institutions/entities/results_by_institution.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('result_by_institutions_by_deliveries_type')
export class ResultByInstitutionsByDeliveriesType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'partner_delivery_type_id',
    type: 'int',
    nullable: false,
  })
  partner_delivery_type_id: number;

  @ManyToOne(() => PartnerDeliveryType, (pd) => pd.id, { nullable: false })
  @JoinColumn({
    name: 'partner_delivery_type_id',
  })
  obj_partner_delivery_type: PartnerDeliveryType;

  @Column({
    name: 'result_by_institution_id',
    type: 'bigint',
    nullable: false,
  })
  result_by_institution_id: number;

  @ManyToOne(() => ResultsByInstitution, (ri) => ri.id, { nullable: false })
  @JoinColumn({
    name: 'result_by_institution_id',
  })
  obj_result_by_institution: ResultsByInstitution;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column({
    name: 'created_by',
    type: 'int',
    nullable: false,
  })
  created_by: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  obj_created_by: User;

  @CreateDateColumn({
    name: 'created_date',
    type: 'timestamp',
  })
  created_date: Date;

  @Column({
    name: 'last_updated_by',
    type: 'int',
    nullable: true,
  })
  last_updated_by: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  obj_last_updated_by: User;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
  })
  last_updated_date: Date;
}
