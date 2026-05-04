import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Version } from '../../../versioning/entities/version.entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

@Entity('phase_initiative_reporting_access')
@Unique('UQ_phase_initiative_reporting', ['version_id', 'initiative_id'])
export class PhaseInitiativeReportingAccess {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: string;

  @Column({ name: 'version_id', type: 'bigint' })
  version_id: number;

  @Column({ name: 'initiative_id', type: 'int' })
  initiative_id: number;

  @Column({ name: 'reporting_enabled', type: 'boolean', default: true })
  reporting_enabled: boolean;

  @Column({
    name: 'created_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_date: Date;

  @Column({
    name: 'last_updated_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  last_updated_date: Date;

  @ManyToOne(() => Version, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_id' })
  obj_version: Version;

  @ManyToOne(() => ClarisaInitiative, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'initiative_id' })
  obj_initiative: ClarisaInitiative;
}
