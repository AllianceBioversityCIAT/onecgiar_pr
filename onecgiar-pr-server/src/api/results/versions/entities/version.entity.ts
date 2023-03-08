import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Ipsr } from '../../../ipsr/entities/ipsr.entity';
import { NonPooledProject } from '../../non-pooled-projects/entities/non-pooled-project.entity';
import { ResultsCenter } from '../../results-centers/entities/results-center.entity';

@Entity('version')
export class Version {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'version_name',
    type: 'text',
    nullable: false,
  })
  version_name: string;

  @Column({
    name: 'start_date',
    type: 'text',
    nullable: true,
  })
  start_date!: string;

  @Column({
    name: 'end_date',
    type: 'text',
    nullable: true,
  })
  end_date!: string;

  @OneToMany(() => Ipsr, i => i.obj_version)
  innovation_by_result: Ipsr[];

  @OneToMany(() => NonPooledProject, i => i.obj_version)
  non_pooled_project: NonPooledProject[];

  @OneToMany(() => ResultsCenter, rc => rc.obj_version)
  results_center: ResultsCenter[];
}
