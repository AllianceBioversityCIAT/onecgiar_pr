import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaActionArea } from '../../clarisa-action-areas/entities/clarisa-action-area.entity';
import { ResultsPackageTocResult } from '../../../api/ipsr/results-package-toc-result/entities/results-package-toc-result.entity';
import { OneToMany } from 'typeorm';
import { ResultsPackageByInitiative } from '../../../api/ipsr/results-package-by-initiatives/entities/results-package-by-initiative.entity';
import { ResultInnovationPackage } from '../../../api/ipsr/result-innovation-package/entities/result-innovation-package.entity';

@Entity('clarisa_initiatives')
export class ClarisaInitiative {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'official_code',
    type: 'text',
  })
  official_code: string;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @Column({
    name: 'short_name',
    type: 'text',
  })
  short_name: string;

  @ManyToOne(() => ClarisaActionArea, (caa) => caa.id)
  @JoinColumn({
    name: 'action_area_id',
  })
  action_area_id: number;

  @Column({
    name: 'active',
    type: 'boolean',
  })
  active: boolean;

  @Column({
    name: 'toc_id',
    type: 'text',
    nullable: true
  })
  toc_id!: string;

  @OneToMany(() => ResultsPackageByInitiative, rptr => rptr.obj_initiative)
  results_package_by_initiative: ResultsPackageByInitiative[];
  
  @OneToMany(() => ResultInnovationPackage, rip => rip.obj_initiative)
  result_innovation_package_array: ResultInnovationPackage[];
}
