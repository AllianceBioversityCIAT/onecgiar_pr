import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('result_innov_section')
export class ResultInnovSection {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    name: 'created_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_date: Date;

  @Column({
    name: 'last_updated_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  last_updated_date: Date;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  is_active: boolean;
}
