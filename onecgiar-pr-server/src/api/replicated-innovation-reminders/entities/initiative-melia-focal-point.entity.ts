// @akili-spec changes/replicated-innovation-reminders
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';

/**
 * `RIR-T-1` — a MELIA focal point of a Science Program / Accelerator (design §3.1, `RIR-R-13`,
 * `RIR-DD-3`).
 *
 * Local data, not a CLARISA catalogue and not a PRMS role: the person is copied on the reminder
 * digests of their SP's innovations and has no PRMS account requirement. There is no UI to edit
 * the list (out of scope); rows arrive through a seed migration.
 *
 * `is_active` (from `BaseEntity`) is the "active flag": the CC query reads only active rows, and an
 * inactive entry is never copied.
 *
 * Schema is created by `1791500000000-RIR-CreateReminderTables`.
 */
@Entity('initiative_melia_focal_point')
@Index('UQ_rir_melia_initiative_email', ['initiative_id', 'email'], {
  unique: true,
})
export class InitiativeMeliaFocalPoint extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({ name: 'initiative_id', type: 'int', nullable: false })
  initiative_id: number;

  @ManyToOne(() => ClarisaInitiative, { nullable: false })
  @JoinColumn({
    name: 'initiative_id',
    foreignKeyConstraintName: 'FK_rir_melia_initiative',
  })
  obj_initiative: ClarisaInitiative;

  @Column({ name: 'name', type: 'varchar', length: 200, nullable: true })
  name: string | null;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: false })
  email: string;
}
