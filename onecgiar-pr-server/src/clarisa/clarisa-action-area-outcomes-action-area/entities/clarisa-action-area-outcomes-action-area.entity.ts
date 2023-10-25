import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ClarisaActionArea } from '../../clarisa-action-areas/entities/clarisa-action-area.entity';
import { ClarisaActionAreaOutcome } from '../../clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';

@Entity('clarisa_action_area_outcomes_action_area')
export class ClarisaActionAreaOutcomesActionArea {
  @PrimaryGeneratedColumn({
    name: 'clarisa_action_area_outcomes_action_area_id',
  })
  clarisa_action_area_outcomes_action_area_id: number;

  @ManyToOne(() => ClarisaActionArea, (caa) => caa.id)
  @JoinColumn({
    name: 'action_area_id',
  })
  action_area_id: number;

  @ManyToOne(() => ClarisaActionAreaOutcome, (cao) => cao.id)
  @JoinColumn({
    name: 'action_area_outcome_id',
  })
  action_area_outcome_id: number;
}
