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
import { Version } from '../../../versioning/entities/version.entity';
import { OneToMany } from 'typeorm';
import { ResultCountriesSubNational } from '../../result-countries-sub-national/entities/result-countries-sub-national.entity';

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

  @Column({
    name: 'version_id',
    type: 'bigint',
    nullable: true,
  })
  version_id: number;

  @ManyToOne(() => Version, (v) => v.id, { nullable: true })
  @JoinColumn({
    name: 'version_id',
  })
  obj_version_id: Version;

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
}
