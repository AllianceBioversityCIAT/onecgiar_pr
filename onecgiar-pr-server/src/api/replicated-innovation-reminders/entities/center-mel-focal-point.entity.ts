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
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';

/**
 * `RIR-T-10` — a MEL focal point of a CGIAR Center (design §15.3, `RIR-R-18`, `RIR-DD-9`).
 *
 * Local data, same idea as `InitiativeMeliaFocalPoint`: receives the Center email listing the
 * bilateral innovations of its center with no update. `is_active` (from `BaseEntity`) is the
 * active flag; inactive rows are never emailed. `center_code` is `clarisa_center.code`
 * (varchar(15)).
 *
 * Schema is created by `1791700000000-RIR-RecipientModelV2`.
 */
@Entity('center_mel_focal_point')
@Index('UQ_rir_center_mel_center_email', ['center_code', 'email'], {
  unique: true,
})
export class CenterMelFocalPoint extends BaseEntity {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @Column({
    name: 'center_code',
    type: 'varchar',
    length: 15,
    charset: 'utf8mb3',
    collation: 'utf8mb3_unicode_ci',
    nullable: false,
  })
  center_code: string;

  @ManyToOne(() => ClarisaCenter, { nullable: false })
  @JoinColumn({
    name: 'center_code',
    referencedColumnName: 'code',
    foreignKeyConstraintName: 'FK_rir_center_mel_center',
  })
  obj_center: ClarisaCenter;

  @Column({ name: 'name', type: 'varchar', length: 200, nullable: true })
  name: string | null;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: false })
  email: string;
}
