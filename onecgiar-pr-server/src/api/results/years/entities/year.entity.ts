import { Column, Entity } from 'typeorm';

@Entity()
export class Year {
  @Column({
    name: 'year',
    type: 'year',
    primary: true,
  })
  year: number;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;

  @Column({
    name: 'start_date',
    type: 'timestamp',
    nullable: true,
  })
  start_date!: Date;

  @Column({
    name: 'end_date',
    type: 'timestamp',
    nullable: true,
  })
  end_date!: Date;
}