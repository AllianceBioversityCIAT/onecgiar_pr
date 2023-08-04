import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
}
