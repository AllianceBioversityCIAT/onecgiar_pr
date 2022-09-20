import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaActionArea } from '../../clarisa-action-areas/entities/clarisa-action-area.entity';
import { ClarisaOutcomeIndicator } from '../../clarisa-outcome-indicators/entities/clarisa-outcome-indicator.entity';
import { Auditable } from '../../../shared/entities/auditableEntity';

@Entity('clarisa_action_areas_outcomes_indicators')
export class ClarisaActionAreasOutcomesIndicator extends Auditable {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => ClarisaActionArea,
    (caa) => caa.id, 
  )
  @JoinColumn({ name: 'action_area_id' })
  action_area_id!: number;

  @Column({
    name: 'outcome_id',
    type: 'int',
    nullable: true
  })
  outcome_id!: number;

  @Column({ 
    name: 'outcome_smo_code', 
    type: 'text' 
  })
  outcome_smo_code: string;

  @Column({ 
    name: 'outcome_statement', 
    type: 'text' 
  })
  outcome_statement: string;

  @ManyToOne(() => ClarisaOutcomeIndicator, (coi) => coi.id, {nullable: true})
  @JoinColumn({
    name:'outcome_indicator_id'
  })
  outcome_indicator_id!: number;

  @Column({ 
    name: 'outcome_indicator_smo_code', 
    type: 'text',
    nullable: true
  })
  outcome_indicator_smo_code!: string;

  @Column({ 
    name: 'outcome_indicator_statement', 
    type: 'text',
    nullable: true
  })
  outcome_indicator_statement!: string;
}
