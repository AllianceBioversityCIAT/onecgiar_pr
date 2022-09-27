import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Auditable } from '../../../../shared/entities/auditableEntity';

@Entity('users')
export class User{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name', type: 'text' })
  first_name: string;

  @Column({ name: 'last_name', type: 'text' })
  last_name: string;

  @Column({ name: 'email', type: 'text' })
  email: string;

  @Column({
    name: 'is_cgiar',
    type: 'boolean'
  })
  is_cgiar: boolean;

  @Column({
    name: 'password',
    type: 'text',
    nullable: true
  })
  password!: string;

  @Column({
    name: 'last_login',
    type: 'timestamp',
    nullable: true
  })
  last_login!: Date;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;

  @ManyToOne(() => User, u => u.id, { nullable: true })
  @JoinColumn({
      name: 'created_by'
  })
  created_by: number;

  @CreateDateColumn({
      name: 'created_date'
  })
  created_date: Date;
  @ManyToOne(() => User, u => u.id, { nullable: true })
  @JoinColumn({
      name: 'last_updated_by'
  })
  
  last_updated_by!: number;
  @UpdateDateColumn({
      name: 'last_updated_date',
      nullable: true
  })
  last_updated_date!: Date;

}
