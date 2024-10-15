import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Notification } from './notification.entity';

@Entity('notifications_type')
export class NotificationType {
  @PrimaryGeneratedColumn({
    type: 'int',
    name: 'notifications_type_id',
  })
  notifications_type_id: number;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @OneToMany(() => Notification, (n) => n.obj_notification_type)
  notifications: Notification[];
}
