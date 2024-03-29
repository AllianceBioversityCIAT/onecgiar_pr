import { ResultIpImpactArea } from '../../../api/ipsr/innovation-pathway/entities/result-ip-impact-area.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClarisaImpactArea } from '../../clarisa-impact-area/entities/clarisa-impact-area.entity';

@Entity('clarisa_impact_area_indicator')
export class ClarisaImpactAreaIndicator {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'indicator_statement',
    type: 'text',
    nullable: true,
  })
  indicator_statement!: string;

  @ManyToOne(() => ClarisaImpactArea, (cia) => cia.id, { nullable: true })
  @JoinColumn({ name: 'impact_area_id' })
  impact_area_id!: number;

  @Column({ name: 'target_year', type: 'int' })
  target_year: number;

  @Column({
    name: 'target_unit',
    type: 'text',
    nullable: true,
  })
  target_unit!: string;

  @Column({
    name: 'value',
    type: 'int',
    nullable: true,
  })
  value!: number;

  @Column({
    name: 'is_aplicable_projected_benefits',
    type: 'boolean',
  })
  is_aplicable_projected_benefits: boolean;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;

  @OneToMany(() => ResultIpImpactArea, (ria) => ria.obj_impact_area_indicator)
  obj_impact_area_indicator_result_impact_area: ResultIpImpactArea[];
}
