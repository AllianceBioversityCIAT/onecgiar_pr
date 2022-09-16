import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaActionArea } from '../../clarisa-action-areas/entities/clarisa-action-area.entity';

@Entity('clarisa_action_areas_outcomes_indicators')
export class ClarisaActionAreasOutcomesIndicator {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => ClarisaActionArea,
    (caa) => caa.actionAreasOutcomesIndicators,
  )
  @JoinColumn({ name: 'action_area_id' })
  actionArea: ClarisaActionArea;

  //! PENDIENTE
  @Column()
  outcomeId: number;

  @Column({ name: 'outcome_smo_code', type: 'text' })
  outcomeSmoCode: string;

  @Column({ name: 'outcome_statement', type: 'text' })
  outcomeStatement: string;

  //! PENDIENTE
  @Column()
  outcomeIndicatorId: number;

  @Column({ name: 'outcome_indicator_smo_code', type: 'text' })
  outcomeIndicatorSmoCode: string;

  @Column({ name: 'outcome_indicator_statement', type: 'text' })
  outcomeIndicatorStatement: string;
}
