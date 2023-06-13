import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../../../auth/modules/user/entities/user.entity';
import { Version } from '../../../versioning/entities/version.entity';
import { ClarisaImpactAreaIndicator } from '../../../../clarisa/clarisa-impact-area-indicators/entities/clarisa-impact-area-indicator.entity';
import { Result } from '../../entities/result.entity';

@Entity('results_impact_area_indicators')
export class ResultsImpactAreaIndicator {
  @PrimaryGeneratedColumn({
    name: 'results_impact_area_indicator_id',
  })
  results_impact_area_indicator_id: number;

  @ManyToOne(() => ClarisaImpactAreaIndicator, (ciai) => ciai.id)
  @JoinColumn({
    name: 'impact_area_indicator_id',
  })
  impact_area_indicator_id: number;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  result_id: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @ManyToOne(() => Version, (v) => v.id)
  @JoinColumn({
    name: 'version_id',
  })
  version_id: number;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'created_date',
    nullable: false,
    type: 'timestamp',
  })
  created_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;
}
