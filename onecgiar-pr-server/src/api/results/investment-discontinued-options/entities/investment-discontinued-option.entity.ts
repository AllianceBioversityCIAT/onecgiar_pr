import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResultType } from '../../result_types/entities/result_type.entity';

@Entity('investment_discontinued_option')
export class InvestmentDiscontinuedOption {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'investment_discontinued_option_id',
  })
  investment_discontinued_option_id: number;

  @Column({
    name: 'option',
    type: 'text',
  })
  option: string;

  @Column({
    name: 'result_type_id',
    type: 'bigint',
  })
  result_type_id: number;

  @ManyToOne(() => ResultType, (rt) => rt.obj_result_type_discontinued)
  @JoinColumn({
    name: 'result_type_id',
  })
  result_type_discontinued: ResultType;
}
