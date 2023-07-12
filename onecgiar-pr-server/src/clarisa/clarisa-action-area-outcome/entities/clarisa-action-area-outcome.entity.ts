import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaActionArea } from '../../../clarisa/clarisa-action-areas/entities/clarisa-action-area.entity';
import { ResultIpAAOutcome } from '../../../api/ipsr/innovation-pathway/entities/result-ip-action-area-outcome.entity';

@Entity('clarisa_action_area_outcome')
export class ClarisaActionAreaOutcome {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'outcomeSMOcode',
    type: 'text',
    nullable: true,
  })
  outcomeSMOcode: string;

  @Column({
    type: 'bigint',
    name: 'outcomeId',
  })
  outcomeId: number;

  @ManyToOne(() => ClarisaActionArea, (caa) => caa.id)
  @JoinColumn({ name: 'actionAreaId' })
  actionAreaId: number;

  @Column({
    name: 'outcomeStatement',
    type: 'text',
    nullable: true,
  })
  outcomeStatement: string;

  @OneToMany(
    () => ResultIpAAOutcome,
    (ria) => ria.obj_action_area_outcome_innovation_package,
  )
  obj_action_area_outcome_innovation_package: ResultIpAAOutcome[];
}
