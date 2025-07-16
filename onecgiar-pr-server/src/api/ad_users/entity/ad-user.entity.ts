import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../results/entities/result.entity';

@Entity('ad_users')
export class AdUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  cn: string;

  @Column({ type: 'text', nullable: true })
  display_name: string;

  @Column({ type: 'varchar', length: 320, nullable: false, unique: true })
  mail: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sam_account_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  given_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sn: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  user_principal_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  department: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  company: string;

  @Column({ type: 'text', nullable: true })
  manager: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  employee_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  employee_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  employee_type: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'datetime', nullable: true })
  last_synced_at: Date;

  @OneToMany(() => Result, (result) => result.obj_lead_contact_person)
  obj_results: Result[];
}
