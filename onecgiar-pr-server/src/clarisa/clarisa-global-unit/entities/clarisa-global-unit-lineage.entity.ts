import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClarisaGlobalUnit } from './clarisa-global-unit.entity';

export enum ClarisaGlobalUnitLineageRelationType {
  MERGE = 'MERGE',
  SPLIT = 'SPLIT',
  SUCCESSOR = 'SUCCESSOR',
  NEW = 'NEW',
}

@Entity('clarisa_global_unit_lineage')
export class ClarisaGlobalUnitLineage {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({
    name: 'from_global_unit_id',
    type: 'bigint',
    nullable: true,
  })
  fromGlobalUnitId?: number | null;

  @Column({
    name: 'to_global_unit_id',
    type: 'bigint',
  })
  toGlobalUnitId: number;

  @Column({
    name: 'relation_type',
    type: 'enum',
    enum: ClarisaGlobalUnitLineageRelationType,
  })
  relationType: ClarisaGlobalUnitLineageRelationType;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => ClarisaGlobalUnit, (unit) => unit.outgoingLineages, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'from_global_unit_id' })
  fromGlobalUnit?: ClarisaGlobalUnit | null;

  @ManyToOne(() => ClarisaGlobalUnit, (unit) => unit.incomingLineages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'to_global_unit_id' })
  toGlobalUnit: ClarisaGlobalUnit;
}
