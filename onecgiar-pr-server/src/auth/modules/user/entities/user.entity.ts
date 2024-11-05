import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Notification } from '../../../../api/notification/entities/notification.entity';
import { UserNotificationSetting } from '../../../../api/user-notification-settings/entities/user-notification-settings.entity';
import { Result } from '../../../../api/results/entities/result.entity';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', type: 'text' })
  first_name: string;

  @Column({ name: 'last_name', type: 'text' })
  last_name: string;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: false })
  email: string;

  @Column({
    name: 'is_cgiar',
    type: 'boolean',
  })
  is_cgiar: boolean;

  @Column({
    name: 'password',
    type: 'text',
    nullable: true,
  })
  password!: string;

  @Column({
    name: 'last_login',
    type: 'timestamp',
    nullable: true,
  })
  last_login!: Date;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'created_by',
  })
  created_by!: number;

  @CreateDateColumn({
    name: 'created_date',
  })
  created_date: Date;

  @ManyToOne(() => User, (u) => u.id, { nullable: true })
  @JoinColumn({
    name: 'last_updated_by',
  })
  last_updated_by!: number;

  @UpdateDateColumn({
    name: 'last_updated_date',
    nullable: true,
  })
  last_updated_date!: Date;

  @UpdateDateColumn({
    name: 'last_pop_up_viewed',
    type: 'timestamp',
    nullable: true,
  })
  last_pop_up_viewed!: Date;

  @OneToMany(
    () => UserNotificationSetting,
    (notificationSetting) => notificationSetting.obj_user,
  )
  obj_user_notification_setting: UserNotificationSetting[];

  @OneToMany(
    () => Notification,
    (notificationSetting) => notificationSetting.obj_target_user,
  )
  obj_target_user_notification: Notification[];

  @OneToMany(
    () => Notification,
    (notificationSetting) => notificationSetting.obj_emitter_user,
  )
  obj_emitter_user_notification: Notification[];

  @OneToMany(
    () => Result,
    (r) => r.obj_qaed_user,
  )
  obj_qaed_user: Result[];
}
