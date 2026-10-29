// @akili-spec quality-assurance/qa-field-catalog
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * QAC-T-2 — one row per catalog phase year (design.md §4). Exposed
 * `catalog_version` = `${phase_year}.${revision}`. No FK to `version` (DD-9).
 */
@Entity('qa_catalog_version')
export class QaCatalogVersion {
  @PrimaryColumn({ name: 'phase_year', type: 'int' })
  phase_year: number;

  @Column({ name: 'portfolio', type: 'varchar', length: 255, nullable: false })
  portfolio: string;

  @Column({ name: 'revision', type: 'int', nullable: false, default: 1 })
  revision: number;

  @Column({
    name: 'content_hash',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  content_hash: string;

  @Column({ name: 'synced_at', type: 'timestamp', nullable: true })
  synced_at: Date | null;
}
