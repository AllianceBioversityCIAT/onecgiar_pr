import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BiReport } from './bi-report.entity';

@Entity('bi_filters')
export class BiFilters extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'variablename',
    type: 'text',
    nullable: false,
  })
  variablename: string;

  @Column({
    name: 'scope',
    type: 'text',
    nullable: false,
  })
  scope: string;

  @Column({
    name: 'table',
    type: 'text',
    nullable: false,
  })
  table: string;

  @Column({
    name: 'column',
    type: 'text',
    nullable: false,
  })
  column: string;

  @Column({
    name: 'operator',
    type: 'text',
    nullable: false,
  })
  operator: string;

  @Column({
    name: 'param_type',
    type: 'text',
    nullable: false,
  })
  param_type: string;

  @Column({
    name: 'report_id',
    type: 'text',
    nullable: false,
  })
  report_id: string;
  @ManyToOne(() => BiReport, (biReport) => biReport.biFilter_array)
  @JoinColumn({ name: 'report_id' })
  biReport_obj: BiReport;
}
