import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('complementary_innovation_functions')
export class ComplementaryInnovationFunctions {
  @PrimaryGeneratedColumn({
    name: 'complementary_innovation_functions_id',
    type: 'bigint',
  })
  complementary_innovation_functions_id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name!: string;
}
