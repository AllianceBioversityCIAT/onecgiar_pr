import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('global_narratives')
export class GlobalNarrative {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name: string;
}
