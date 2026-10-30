import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * IRS-R-3 — catalog of impact study types (design §3.1, IRS-DD-2).
 *
 * Seeded by the migration with exactly two rows (1 Learning study, 2 Accountability study); the id is
 * NOT auto-incremented so the seed ids are stable across environments.
 */
@Entity('impact_study_type')
export class ImpactStudyType {
  @PrimaryColumn({ name: 'id', type: 'int' })
  id: number;

  @Column({ name: 'name', type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ name: 'definition', type: 'text', nullable: false })
  definition: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  is_active: boolean;
}
