// @akili-spec quality-assurance/qa-field-catalog
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** QAC-T-2 — result types the catalog applies to (design.md §4). */
@Entity('qa_catalog_result_type')
export class QaCatalogResultType {
  @PrimaryColumn({ name: 'key', type: 'varchar', length: 255 })
  key: string;

  @Column({ name: 'label', type: 'varchar', length: 255, nullable: false })
  label: string;

  @Column({ name: 'level', type: 'varchar', length: 255, nullable: true })
  level: string | null;
}
