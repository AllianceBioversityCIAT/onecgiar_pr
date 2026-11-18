// @akili-spec changes/rir-center-focal-routing
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base-entity';
import { ClarisaCenter } from '../../../clarisa/clarisa-centers/entities/clarisa-center.entity';

/**
 * `RCF-T-1` — per-Center opt-in to receive ALL replicated-innovation reminders of the
 * innovations the Center leads (`RCF-R-1`, `RCF-DD-1`). A missing row means off.
 *
 * Independent of `center_mel_focal_point` (the contacts). `center_code` is
 * `clarisa_center.code` (varchar(15)), same charset/collation as the contacts table.
 *
 * Schema is created by `1793400000000-RCF-CenterRouting`.
 */
@Entity('center_reminder_routing')
export class CenterReminderRouting extends BaseEntity {
  @PrimaryColumn({
    name: 'center_code',
    type: 'varchar',
    length: 15,
    charset: 'utf8mb3',
    collation: 'utf8mb3_unicode_ci',
  })
  center_code: string;

  @OneToOne(() => ClarisaCenter, { nullable: false })
  @JoinColumn({
    name: 'center_code',
    referencedColumnName: 'code',
    foreignKeyConstraintName: 'FK_rcf_center_routing_center',
  })
  obj_center: ClarisaCenter;

  @Column({
    name: 'route_all_to_center',
    type: 'tinyint',
    nullable: false,
    default: 0,
  })
  route_all_to_center: number;
}
