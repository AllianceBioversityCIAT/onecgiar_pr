import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('validation_maps')
export class ValidationMaps extends BaseEntity {
  @PrimaryColumn({
    name: 'display_name',
    type: 'varchar',
    length: 255,
  })
  display_name: string;

  @Column({
    name: 'function_name',
    type: 'varchar',
    length: 255,
  })
  function_name: string;
}
