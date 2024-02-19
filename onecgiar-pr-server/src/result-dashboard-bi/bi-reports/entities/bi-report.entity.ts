import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('bi_reports')
export class BiReport {
  @PrimaryGeneratedColumn()
  id: number;

  @PrimaryColumn({
    name: 'report_name',
    type: 'varchar',
    length: 30,
  })
  report_name: string;

  @Column({
    name: 'report_title',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  report_title: string;

  @Column({
    name: 'report_description',
    type: 'varchar',
    length: 140,
    nullable: true,
  })
  report_description: string;

  @Column({
    name: 'report_id',
    type: 'text',
    nullable: true,
  })
  report_id: string;

  @Column({
    name: 'dataset_id',
    type: 'text',
    nullable: true,
  })
  dataset_id: string;

  @Column({
    name: 'group_id',
    type: 'text',
    nullable: true,
  })
  group_id: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;

  @Column({
    name: 'has_rls_security',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  has_rls_security: boolean;

  @Column({
    name: 'has_full_screen',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  has_full_screen: boolean;

  @Column({
    name: 'report_order',
    type: 'integer',
    nullable: false,
    default: null,
  })
  report_order: number;
}
