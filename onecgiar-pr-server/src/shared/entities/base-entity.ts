import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class BaseEntity {
  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
    nullable: false,
  })
  is_active: boolean;

  @CreateDateColumn({
    name: 'created_date',
    type: 'timestamp',
    nullable: false,
  })
  created_date: Date;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
    nullable: true,
  })
  last_updated_date!: Date;

  @Column({
    name: 'created_by',
    type: 'bigint',
    nullable: true,
  })
  created_by!: number;

  @Column({
    name: 'last_updated_by',
    type: 'bigint',
    nullable: true,
  })
  last_updated_by!: number;
}
