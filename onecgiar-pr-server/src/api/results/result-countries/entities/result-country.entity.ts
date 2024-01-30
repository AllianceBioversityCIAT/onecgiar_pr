import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Result } from '../../entities/result.entity';
import { ClarisaCountry } from '../../../../clarisa/clarisa-countries/entities/clarisa-country.entity';
import { OneToMany } from 'typeorm';
import { ResultCountriesSubNational } from '../../result-countries-sub-national/entities/result-countries-sub-national.entity';
import { ResultCountrySubnational } from '../../result-countries-sub-national/entities/result-country-subnational.entity';

@Entity('result_country')
export class ResultCountry {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  result_country_id: number;

  @Column({ type: 'bigint', nullable: true })
  result_id: number;

  @Column({ type: 'int', nullable: true })
  country_id: number;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  is_active: boolean;

  @CreateDateColumn({
    name: 'created_date',
    type: 'timestamp',
  })
  created_date: Date;

  @UpdateDateColumn({
    name: 'last_updated_date',
    type: 'timestamp',
  })
  last_updated_date: Date;

  //object relations
  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  result_object: Result;

  @ManyToOne(() => ClarisaCountry, (cc) => cc.id)
  @JoinColumn({
    name: 'country_id',
  })
  country_object: ClarisaCountry;

  @OneToMany(
    () => ResultCountriesSubNational,
    (rcsn) => rcsn.obj_result_countries,
  )
  result_countries_sub_national: ResultCountriesSubNational[];

  @OneToMany(() => ResultCountrySubnational, (rcs) => rcs.result_country_object)
  result_countries_subnational_array: ResultCountrySubnational[];
}
