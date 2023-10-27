import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('unit_time')
export class UnitTime {
  @PrimaryGeneratedColumn({
    name: 'unit_time_id',
    type: 'bigint',
  })
  unit_time_id: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 45,
  })
  name: string;
}
