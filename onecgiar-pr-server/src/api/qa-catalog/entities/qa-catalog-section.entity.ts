// @akili-spec quality-assurance/qa-field-catalog
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * QAC-T-2 — catalog sections (design.md §4). `valid_to` is nullable: a retired
 * section keeps its row (QAC-R-3). No FK to `version`: years are plain integers (DD-9).
 */
@Entity('qa_catalog_section')
export class QaCatalogSection {
  @PrimaryColumn({ name: 'key', type: 'varchar', length: 255 })
  key: string;

  @Column({ name: 'label', type: 'varchar', length: 255, nullable: false })
  label: string;

  @Column({ name: 'order', type: 'int', nullable: false, default: 0 })
  order: number;

  @Column({ name: 'result_types', type: 'json', nullable: true })
  result_types: string[] | null;

  @Column({ name: 'valid_from', type: 'int', nullable: false })
  valid_from: number;

  @Column({ name: 'valid_to', type: 'int', nullable: true })
  valid_to: number | null;
}
