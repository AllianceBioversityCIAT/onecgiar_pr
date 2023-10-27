import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('regional_integrated')
export class RegionalIntegrated {
  @PrimaryGeneratedColumn({
    name: 'regional_integrated_id',
    type: 'bigint',
  })
  regional_integrated_id: number;

  @Column({
    name: 'name',
    type: 'text',
  })
  name: string;
}
