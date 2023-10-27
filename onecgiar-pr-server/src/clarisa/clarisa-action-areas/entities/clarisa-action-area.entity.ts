import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ResultsTocResult } from '../../../api/results/results-toc-results/entities/results-toc-result.entity';

@Entity('clarisa_action_area')
export class ClarisaActionArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'text' })
  name: string;

  @Column({ name: 'description', type: 'text' })
  description: string;

  @OneToMany(() => ResultsTocResult, (rtr) => rtr.action_areas)
  obj_results_toc_result: ResultsTocResult[];
}
