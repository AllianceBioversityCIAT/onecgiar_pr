import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class InstitutionRole {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name!: string;
}
