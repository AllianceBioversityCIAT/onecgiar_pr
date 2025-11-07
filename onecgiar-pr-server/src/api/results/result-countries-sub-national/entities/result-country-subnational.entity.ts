import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';
import { ClarisaSubnationalScope } from '../../../../clarisa/clarisa-subnational-scope/entities/clarisa-subnational-scope.entity';
import { GeoScopeRole } from '../../../results-framework-reporting/geo_scope_role/entities/geo_scope_role.entity';

@Entity('result_country_subnational')
export class ResultCountrySubnational extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_country_subnational_id',
    type: 'bigint',
  })
  result_country_subnational_id: number;

  @Column({ nullable: false, type: 'bigint' })
  result_country_id: number;

  @Column({ nullable: false, type: 'varchar', length: '255' })
  clarisa_subnational_scope_code: string;

  @Column({ type: 'int', nullable: true })
  geo_scope_role_id: number;

  @ManyToOne(() => GeoScopeRole, (v) => v.id, { nullable: false })
  @JoinColumn({
    name: 'geo_scope_role_id',
  })
  obj_geo_scope_role: GeoScopeRole;

  //object relations
  @ManyToOne(() => ResultCountry, (rc) => rc.result_countries_subnational_array)
  @JoinColumn({
    name: 'result_country_id',
  })
  result_country_object: ResultCountry;

  @ManyToOne(
    () => ClarisaSubnationalScope,
    (css) => css.result_countries_subnational_array,
  )
  @JoinColumn({
    name: 'clarisa_subnational_scope_code',
    referencedColumnName: 'code',
  })
  clarisa_subnational_scope_object: ClarisaSubnationalScope;
}
