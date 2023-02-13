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

@Entity('result_country')
export class ResultCountry {
  @PrimaryGeneratedColumn({
    type: 'bigint',
  })
  result_country_id: number;

  @Column()
  result_id: number;

  @Column()
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
}
