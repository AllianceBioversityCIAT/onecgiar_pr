import { Result } from '../../../../api/results/entities/result.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { ClarisaImpactArea } from '../../../../clarisa/clarisa-impact-area/entities/clarisa-impact-area.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('primary_impact_area')
export class PrimaryImpactArea {
  @Column({
    name: 'result_code',
    primary: true,
  })
  result_code: number;

  @OneToOne(() => Result, (r) => r.result_code, { nullable: false })
  @JoinColumn({
    name: 'result_code',
  })
  result_c: number;

  @ManyToOne(() => ClarisaImpactArea, (c) => c.id, { nullable: false })
  @JoinColumn({
    name: 'impact_area_id',
  })
  impact_area_id: number;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_date',
  })
  created_date: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'last_updated_date',
    nullable: true,
  })
  last_updated_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'updated_by',
  })
  updated_by: number;
}
