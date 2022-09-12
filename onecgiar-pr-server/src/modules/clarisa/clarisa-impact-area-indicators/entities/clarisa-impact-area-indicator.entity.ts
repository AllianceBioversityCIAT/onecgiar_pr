import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaImpactArea } from '../../clarisa-impact-area/entities/clarisa-impact-area.entity';

@Entity('clarisa_impact_area_indicator')
export class ClarisaImpactAreaIndicator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'indicator_statement', type: 'text' })
  indicatorStatement: string;

  @ManyToOne(() => ClarisaImpactArea, (cia) => cia.impactAreaIndicators)
  @JoinColumn({ name: 'impact_area_id' })
  impactArea: ClarisaImpactArea;

  @Column({ name: 'target_year', type: 'int' })
  targetYear: number;

  @Column({ name: 'target_unit', type: 'text' })
  targetUnit: string;

  @Column({ name: 'value', type: 'int' })
  value: number;

  @Column({ name: 'is_aplicable_projected_benefits', type: 'boolean' })
  isAplicableProjectedBenefits: boolean;
}
