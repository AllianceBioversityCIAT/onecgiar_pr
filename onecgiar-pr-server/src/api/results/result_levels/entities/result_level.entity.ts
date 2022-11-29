import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('result_level')
export class ResultLevel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;
}
