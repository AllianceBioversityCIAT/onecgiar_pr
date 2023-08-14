import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResultQuestion } from './result-question.entity';
import { Result } from '../../entities/result.entity';

@Entity('result_answers')
export class ResultAnswer {
  @PrimaryGeneratedColumn({
    name: 'result_answer_id',
    type: 'bigint',
  })
  result_answer_id: number;

  @Column({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'result_question_id',
    type: 'bigint',
  })
  result_question_id: number;

  @Column({
    name: 'answer_text',
    type: 'text',
    nullable: true,
  })
  answer_text: string;

  @Column({
    name: 'answer_boolean',
    type: 'boolean',
    nullable: true,
  })
  answer_boolean: boolean;

  @ManyToOne(() => Result, (rq) => rq.obj_result_id)
  @JoinColumn({
    name: 'result_id',
  })
  obj_result_id: Result[];

  @ManyToOne(() => ResultQuestion, (rq) => rq.obj_result_question)
  @JoinColumn({
    name: 'result_question_id',
  })
  obj_result_question: ResultQuestion[];
}
