import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Ipsr } from './ipsr.entity';

@Entity('ipsr_role')
export class IpsrRole {
  @PrimaryGeneratedColumn({
    name: 'ipsr_role_id',
    type: 'bigint',
  })
  ipsr_role_id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name!: string;

  @OneToMany(() => Ipsr, (i) => i.obj_ipsr_role)
  obj_ipsr_role: Ipsr[];
}
