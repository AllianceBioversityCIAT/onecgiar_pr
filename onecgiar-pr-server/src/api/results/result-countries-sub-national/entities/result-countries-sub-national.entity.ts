import {
  PrimaryGeneratedColumn,
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Version } from '../../../versioning/entities/version.entity';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';

@Entity('result_countries_sub_national')
export class ResultCountriesSubNational extends BaseEntity {
  @PrimaryGeneratedColumn({
    name: 'result_countries_sub_national_id',
    type: 'bigint',
  })
  result_countries_sub_national_id: number;

  @Column({
    name: 'result_countries_id',
    type: 'bigint',
  })
  result_countries_id: number;

  @Column({
    name: 'sub_level_one_id',
    type: 'bigint',
    nullable: true,
  })
  sub_level_one_id!: number;

  @Column({
    name: 'sub_level_one_name',
    type: 'text',
    nullable: true,
  })
  sub_level_one_name!: string;

  @Column({
    name: 'sub_level_two_id',
    type: 'bigint',
    nullable: true,
  })
  sub_level_two_id!: number;

  @Column({
    name: 'sub_level_two_name',
    type: 'text',
    nullable: true,
  })
  sub_level_two_name!: string;

  @ManyToOne(() => ResultCountry, (rc) => rc.result_countries_sub_national)
  @JoinColumn({
    name: 'result_countries_id',
  })
  obj_result_countries: number;
}
