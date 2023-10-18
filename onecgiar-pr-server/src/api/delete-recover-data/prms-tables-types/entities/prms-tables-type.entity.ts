import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('prms_tables_types')
export class PrmsTablesType {
  @PrimaryGeneratedColumn({ type: 'int', name: 'prms_tables_types_id' })
  prms_tables_types_id: number;

  @Column({
    name: 'table_name',
    type: 'varchar',
    length: 50,
    nullable: false,
    unique: true,
  })
  table_name: string;

  @Column({
    name: 'table_type',
    type: 'text',
    nullable: false,
  })
  table_type: string;

  @Column({
    name: 'is_deprecated',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  is_deprecated: boolean;
}
