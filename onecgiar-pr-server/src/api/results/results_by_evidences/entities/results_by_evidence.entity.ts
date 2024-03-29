import { User } from '../../../../auth/modules/user/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { Evidence } from '../../evidences/entities/evidence.entity';
import { EvidenceType } from '../../evidence_types/entities/evidence_type.entity';

@Entity('results_by_evidence')
export class ResultsByEvidence {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @ManyToOne(() => Result, (r) => r.id, { nullable: false })
  @JoinColumn({
    name: 'results_id',
  })
  results_id: number;

  @ManyToOne(() => Evidence, (e) => e.id, { nullable: false })
  @JoinColumn({
    name: 'evidences_id',
  })
  evidences_id: number;

  @ManyToOne(() => EvidenceType, (et) => et.id, { nullable: false })
  @JoinColumn({
    name: 'evidence_types_id',
  })
  evidence_types_id: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
  })
  is_active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: false })
  @JoinColumn({
    name: 'created_by',
  })
  created_by: number;

  @CreateDateColumn({
    name: 'creation_date',
    nullable: false,
    type: 'timestamp',
  })
  creation_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    nullable: true,
    type: 'timestamp',
  })
  last_updated_date!: Date;
}
