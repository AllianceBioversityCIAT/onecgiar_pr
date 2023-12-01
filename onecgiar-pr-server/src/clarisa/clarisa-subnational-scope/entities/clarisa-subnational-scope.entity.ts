import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { SubnationalOtherName } from './subnational-other-name';
import { ResultCountrySubnational } from '../../../api/results/result-countries-sub-national/entities/result-country-subnational.entity';

@Entity('clarisa_subnational_scopes')
export class ClarisaSubnationalScope {
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column({
    type: 'varchar',
    length: '255',
    unique: true,
  })
  code: string;

  @Column({
    nullable: true,
    type: 'text',
  })
  name: string;

  @Column({
    nullable: true,
    type: 'bigint',
  })
  country_id: number;

  @Column({
    nullable: true,
    type: 'text',
  })
  local_name: string;

  @Column({
    nullable: true,
    type: 'json',
  })
  other_names: SubnationalOtherName[];

  @Column({
    nullable: true,
    type: 'text',
  })
  language_iso_2: string;

  @Column({
    nullable: true,
    type: 'text',
  })
  country_iso_alpha_2: string;

  @Column({
    nullable: true,
    type: 'text',
  })
  romanization_system_name: string;

  @Column({
    nullable: true,
    type: 'text',
  })
  subnational_category_name: string;

  @Column({
    type: 'tinyint',
  })
  is_active: boolean;

  //object relations
  @OneToMany(
    () => ResultCountrySubnational,
    (rcs) => rcs.clarisa_subnational_scope_object,
  )
  result_countries_subnational_array: ResultCountrySubnational[];
}
