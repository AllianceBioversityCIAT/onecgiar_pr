import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('geo_scope_role')
export class GeoScopeRole {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
