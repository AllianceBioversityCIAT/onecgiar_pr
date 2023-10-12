import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('regional_leadership')
export class RegionalLeadership {
  @PrimaryGeneratedColumn({
    name: 'regional_leadership_id',
    type: 'bigint',
  })
  regional_leadership_id: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;
}
