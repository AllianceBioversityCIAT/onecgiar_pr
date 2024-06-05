import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BiReport } from './bi-report.entity';

@Entity('bi_subpages')
export class BiSubpages extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'section_number',
    type: 'text',
    nullable: false,
  })
  section_number: string;

  @Column({
    name: 'page_displayName',
    type: 'text',
    nullable: false,
  })
  page_displayName: string;

  @Column({
    name: 'page_name',
    type: 'text',
    nullable: false,
  })
  page_name: string;

  @Column({
    name: 'report_id',
    type: 'int',
    nullable: true,
  })
  report_id: number;
  @ManyToOne(() => BiReport, (biReport) => biReport.biSubPages_array)
  @JoinColumn({ name: 'report_id' })
  biReport_obj: BiReport;
}
