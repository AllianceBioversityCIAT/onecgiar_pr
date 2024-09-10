import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { ClarisaInitiative } from '../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { BaseEntity } from '../../../shared/entities/base-entity';

@Entity('user_notification_settings')
export class UserNotificationSetting extends BaseEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @Column({
    type: 'int',
  })
  user_id: number;

  @Column({
    type: 'int',
  })
  initiative_id: number;

  @Column({
    default: false,
    type: 'boolean',
  })
  email_notifications_contributing_request_enabled: boolean;

  @Column({
    default: false,
    type: 'boolean',
  })
  email_notifications_updates_enabled: boolean;

  @ManyToOne(() => User, (user) => user.obj_user_notification_setting)
  @JoinColumn({ name: 'user_id' })
  obj_user: User;

  @ManyToOne(
    () => ClarisaInitiative,
    (rbi) => rbi.obj_user_notification_setting,
  )
  @JoinColumn({ name: 'initiative_id' })
  obj_clarisa_initiatives: ClarisaInitiative;
}
