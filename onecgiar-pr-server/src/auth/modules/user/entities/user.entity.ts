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
import { UserNotificationSetting } from '../../../../api/user_notification_settings/entities/user_notification_setting.entity';

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

  @OneToMany(
    () => UserNotificationSetting,
    (notificationSetting) => notificationSetting.obj_user,
  )
  obj_user_notification_setting: UserNotificationSetting[];
}
