import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationLevel } from './notification_level.entity';
import { NotificationType } from './notification_type.entity';
import { User } from '../../../auth/modules/user/entities/user.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'notification_id',
  })
  notification_id: number;

  @Column({
    type: 'int',
    name: 'notification_level',
  })
  notification_level: number;

  @ManyToOne(() => NotificationLevel, (nl) => nl.notifications_level_id)
  @JoinColumn({ name: 'notification_level' })
  obj_notification_level: NotificationLevel;

  @Column({
    type: 'int',
    name: 'notification_type',
    nullable: true,
  })
  notification_type: number;

  @ManyToOne(() => NotificationType, (nt) => nt.notifications_type_id)
  @JoinColumn({ name: 'notification_type' })
  obj_notification_type: NotificationType;

  @Column({
    type: 'int',
    name: 'user',
    nullable: true,
  })
  target_user: number;

  @ManyToOne(() => User, (u) => u.obj_target_user_notification)
  @JoinColumn({ name: 'target_user' })
  obj_target_user: User;

  @Column({
    type: 'int',
    name: 'emitter',
    nullable: true,
  })
  emitter_user: number;

  @ManyToOne(() => User, (u) => u.obj_emitter_user_notification)
  @JoinColumn({ name: 'emitter_user' })
  obj_emitter_user: User;

  @Column({
    type: 'bigint',
    name: 'result_id',
    nullable: true,
  })
  result_id: number;

  @ManyToOne(() => Result, (r) => r.obj_result_notification)
  @JoinColumn({ name: 'result_id' })
  obj_result: Result;

  @Column({
    type: 'text',
    name: 'text',
    nullable: true,
  })
  text: string;

  @Column({
    type: 'boolean',
    name: 'read',
    default: false,
  })
  read: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_date',
  })
  created_date: Date;

  @Column({
    type: 'timestamp',
    name: 'read_date',
    nullable: true,
  })
  read_date: Date;
}
