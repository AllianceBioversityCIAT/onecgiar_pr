import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaImpactArea } from '../../clarisa-impact-area/entities/clarisa-impact-area.entity';

@Entity('clarisa_global_targets')
export class ClarisaGlobalTarget {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ClarisaImpactArea, (cia) => cia.globalTarget)
  @JoinColumn({ name: 'impact_area_id' })
  impactArea: ClarisaImpactArea;

  @Column({ name: 'target', type: 'text' })
  target: number;
}
