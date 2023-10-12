import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('units_of_measure')
export class UnitsOfMeasure {
  @PrimaryGeneratedColumn({
    name: 'unit_of_measure_id',
  })
  unit_of_measure_id: number;

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
