import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ResultQuestion } from '../../result-questions/entities/result-question.entity';
import { InvestmentDiscontinuedOption } from '../../investment-discontinued-options/entities/investment-discontinued-option.entity';

@Entity()
export class ResultType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string;

  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: true,
    default: true,
  })
  isActive!: boolean;

  @OneToMany(() => ResultQuestion, (rq) => rq.obj_result_type)
  obj_result_type: ResultQuestion[];

  @OneToMany(
    () => InvestmentDiscontinuedOption,
    (rq) => rq.result_type_discontinued,
  )
  obj_result_type_discontinued: InvestmentDiscontinuedOption[];
}
