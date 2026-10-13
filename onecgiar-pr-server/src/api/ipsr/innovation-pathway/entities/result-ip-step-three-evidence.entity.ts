import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * P2-3824: link between an IPSR Step 3 component (`result_by_innovation_package`) and one of its evidence rows
 * (`evidence`, type 7), per level (`readiness` | `use`).
 *
 * The table is created by migration 1790347604000-IpsrStepThreeEvidence and is read and written with raw SQL
 * (evidences.repository.ts). This entity only mirrors it so the metadata is known (QA field catalog completeness guard);
 * it has no relations and no service uses it, so no behaviour depends on it. It does not extend `BaseEntity` on purpose:
 * the table has no created_by / last_updated_* columns, and it keeps the migration's exact shape.
 */
@Entity('result_ip_step_three_evidence')
@Index('UQ_ip_step_three_evidence_evidence', ['evidence_id'], { unique: true })
@Index('IDX_ip_step_three_evidence_component', [
  'result_by_innovation_package_id',
  'ipsr_evidence_level',
])
export class ResultIpStepThreeEvidence {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'evidence_id',
    type: 'bigint',
    nullable: false,
    comment: 'P2-3824: evidence row (type 7)',
  })
  evidence_id: number;

  @Column({
    name: 'result_by_innovation_package_id',
    type: 'bigint',
    nullable: false,
    comment: 'P2-3824: IPSR Step 3 component',
  })
  result_by_innovation_package_id: number;

  @Column({
    name: 'ipsr_evidence_level',
    type: 'varchar',
    length: 20,
    nullable: false,
    comment: 'P2-3824: readiness | use',
  })
  ipsr_evidence_level: string;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    nullable: false,
    default: 1,
  })
  is_active: number;

  @Column({
    name: 'created_date',
    type: 'timestamp',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_date: Date;
}
