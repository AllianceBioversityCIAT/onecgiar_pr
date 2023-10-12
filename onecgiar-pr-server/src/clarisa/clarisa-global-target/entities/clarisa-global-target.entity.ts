import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaImpactArea } from '../../clarisa-impact-area/entities/clarisa-impact-area.entity';
import { Auditable } from '../../../shared/entities/auditableEntity';

@Entity('clarisa_global_targets')
export class ClarisaGlobalTarget {
  @PrimaryGeneratedColumn({
    name: 'targetId',
  })
  targetId: number;

  @ManyToOne(() => ClarisaImpactArea, (cia) => cia.id)
  @JoinColumn({ name: 'impactAreaId' })
  impactAreaId: number;

  @Column({ name: 'target', type: 'text' })
  target: number;
}
