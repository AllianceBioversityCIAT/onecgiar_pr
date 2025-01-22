import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Notification } from './notification.entity';

@Entity('notifications_level')
export class NotificationLevel {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'notifications_level_id',
  })
  notifications_level_id: number;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @OneToMany(() => Notification, (n) => n.obj_notification_level)
  notifications: Notification[];
}
