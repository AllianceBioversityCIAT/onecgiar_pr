import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('role_levels')
export class RoleLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'name',
  })
  name: string;
}
