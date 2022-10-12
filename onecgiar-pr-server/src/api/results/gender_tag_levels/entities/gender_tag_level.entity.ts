import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class GenderTagLevel {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'title',
    type: 'text',
    nullable: true,
  })
  title!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;
}
