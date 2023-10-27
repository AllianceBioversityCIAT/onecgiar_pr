import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ClarisaSdg } from '../../../../clarisa/clarisa-sdgs/entities/clarisa-sdg.entity';
import { ClarisaSdgsTarget } from '../../../../clarisa/clarisa-sdgs-targets/entities/clarisa-sdgs-target.entity';
import { Result } from '../../entities/result.entity';

@Entity('result_sdg_targets')
export class ResultSdgTargets extends BaseEntity {
  @PrimaryGeneratedColumn()
  result_sdg_target_id: number;

  @Column({
    type: 'bigint',
    name: 'result_id',
  })
  result_id: number;

  @Column({
    type: 'bigint',
    name: 'clarisa_sdg_usnd_code',
  })
  clarisa_sdg_usnd_code: number;

  @Column({
    type: 'bigint',
    name: 'clarisa_sdg_target_id',
  })
  clarisa_sdg_target_id: number;

  @ManyToOne(() => Result, (tr) => tr.id, { nullable: true })
  @JoinColumn({
    name: 'result_id',
  })
  result_ids!: Result;

  @ManyToOne(() => ClarisaSdg, (cs) => cs.usnd_code, { nullable: true })
  @JoinColumn({
    name: 'clarisa_sdg_usnd_code',
  })
  obj_clarisa_sdg_usnd_code: ClarisaSdg;

  @ManyToOne(() => ClarisaSdgsTarget, (cs) => cs.id, { nullable: true })
  @JoinColumn({
    name: 'clarisa_sdg_target_id',
  })
  obj_clarisa_sdg_target: ClarisaSdgsTarget;
}
