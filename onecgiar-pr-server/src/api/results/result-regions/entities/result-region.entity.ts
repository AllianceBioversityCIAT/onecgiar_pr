import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClarisaRegion } from '../../../../clarisa/clarisa-regions/entities/clarisa-region.entity';
import { Result } from '../../entities/result.entity';
import { GeoScopeRole } from '../../../results-framework-reporting/geo_scope_role/entities/geo_scope_role.entity';

@Entity('result_region')
export class ResultRegion {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  result_region_id: number;

  @Column({ type: 'int', nullable: true })
  region_id: number;

  @Column({ type: 'bigint', nullable: true })
  result_id: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  is_active: boolean;

  @Column({ type: 'int', nullable: true })
  geo_scope_role_id: number;

  @ManyToOne(() => GeoScopeRole, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'geo_scope_role_id',
  })
  obj_geo_scope_role: GeoScopeRole;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_date',
  })
  created_date: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'last_updated_date',
    nullable: true,
  })
  last_updated_date: Date;

  //object relations
  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  result_object: Result;

  @ManyToOne(() => ClarisaRegion, (cr) => cr.um49Code)
  @JoinColumn({
    name: 'region_id',
  })
  region_object: ClarisaRegion;
}
