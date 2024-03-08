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
    name: 'report_name',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  report_name: string;

  @Column({
    name: 'section_number',
    type: 'text',
    nullable: false,
  })
  section_number: string;

  @Column({
    name: 'section_name',
    type: 'text',
    nullable: false,
  })
  section_name: string;

  @Column({
    name: 'section_name_code',
    type: 'text',
    nullable: false,
  })
  section_name_code: string;
}
