import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Result } from '../../entities/result.entity';
import { InvestmentDiscontinuedOption } from '../../investment-discontinued-options/entities/investment-discontinued-option.entity';

@Entity('results_investment_discontinued_options')
export class ResultsInvestmentDiscontinuedOption extends BaseEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'results_investment_discontinued_option_id',
  })
  results_investment_discontinued_option_id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
    nullable: false,
  })
  result_id: number;

  @Column({
    name: 'investment_discontinued_option_id',
    type: 'bigint',
    nullable: false,
  })
  investment_discontinued_option_id: number;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string;

  @ManyToOne(() => Result, (r) => r.id)
  @JoinColumn({
    name: 'result_id',
  })
  result: Result;

  @ManyToOne(
    () => InvestmentDiscontinuedOption,
    (ido) => ido.investment_discontinued_option_id,
  )
  @JoinColumn({
    name: 'investment_discontinued_option_id',
  })
  investment_discontinued_option: InvestmentDiscontinuedOption;
}
