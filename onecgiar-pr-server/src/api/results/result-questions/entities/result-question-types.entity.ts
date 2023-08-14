import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ResultQuestion } from './result-question.entity';

@Entity('result_question_types')
export class ResultQuestionType {
  @PrimaryGeneratedColumn({
    name: 'result_question_type_id',
    type: 'bigint',
  })
  result_question_type_id: number;

  @Column({
    name: 'type_description',
    type: 'text',
  })
  type_description: string;

  @OneToMany(() => ResultQuestion, (rq) => rq.obj_result_question_type)
  obj_result_question_type: ResultQuestion[];
}
