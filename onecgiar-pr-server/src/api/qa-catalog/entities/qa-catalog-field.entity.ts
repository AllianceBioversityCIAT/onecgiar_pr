// @akili-spec quality-assurance/qa-field-catalog
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * QAC-T-2 — catalog fields and subfields (design.md §4, DD-4: one table, subfields
 * are rows with `parent_key`).
 *
 * `parent_key` is NOT NULL with default '' (empty string = top-level) so the unique
 * index (`key`, `parent_key`) also enforces top-level key uniqueness: MySQL unique
 * indexes allow multiple NULLs. `valid_to` is nullable; retired rows are kept (QAC-R-3).
 */
@Entity('qa_catalog_field')
@Index('IDX_qa_catalog_field_key_parent', ['key', 'parent_key'], {
  unique: true,
})
export class QaCatalogField {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'key', type: 'varchar', length: 255, nullable: false })
  key: string;

  @Column({
    name: 'parent_key',
    type: 'varchar',
    length: 255,
    nullable: false,
    default: '',
  })
  parent_key: string;

  @Column({ name: 'label', type: 'varchar', length: 255, nullable: false })
  label: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'type', type: 'varchar', length: 255, nullable: false })
  type: string;

  @Column({
    name: 'control_list',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  control_list: string | null;

  @Column({ name: 'section_key', type: 'varchar', length: 255, nullable: true })
  section_key: string | null;

  @Column({ name: 'order', type: 'int', nullable: false, default: 0 })
  order: number;

  @Column({ name: 'result_types', type: 'json', nullable: true })
  result_types: string[] | null;

  @Column({
    name: 'required',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  required: boolean;

  @Column({
    name: 'required_confirmed',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  required_confirmed: boolean;

  @Column({ name: 'required_when', type: 'json', nullable: true })
  required_when: Record<string, unknown> | null;

  @Column({ name: 'valid_from', type: 'int', nullable: false })
  valid_from: number;

  @Column({ name: 'valid_to', type: 'int', nullable: true })
  valid_to: number | null;

  @Column({ name: 'storage', type: 'json', nullable: true })
  storage: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;
}
