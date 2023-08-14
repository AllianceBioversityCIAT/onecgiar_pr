import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResultQuestionType } from './result-question-types.entity';
import { ResultType } from '../../result_types/entities/result_type.entity';
import { ResultAnswer } from './result-answers.entity';

@Entity('result_questions')
export class ResultQuestion {
  @PrimaryGeneratedColumn({
    name: 'result_question_id',
    type: 'bigint',
  })
  result_question_id: number;

  @Column({
    name: 'question_text',
    type: 'text',
    nullable: true,
  })
  question_text: string;

  @Column({
    name: 'question_description',
    type: 'text',
    nullable: true,
  })
  question_description: string;

  @Column({
    name: 'result_type_id',
    type: 'bigint',
  })
  result_type_id: number;

  @Column({
    name: 'parent_question_id',
    type: 'bigint',
  })
  parent_question_id: number;

  @Column({
    name: 'question_type_id',
    type: 'bigint',
  })
  question_type_id: number;

  @Column({
    name: 'question_level',
    type: 'bigint',
    nullable: true,
  })
  question_level: number;

  @ManyToOne(() => ResultType, (rqt) => rqt.obj_result_type)
  @JoinColumn({
    name: 'result_type_id',
  })
  obj_result_type: ResultQuestionType;

  // Relation with the same entity primary key
  @OneToOne(() => ResultQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_question_id' })
  obj_parent_question_id: ResultQuestion;

  @ManyToOne(() => ResultQuestionType, (rqt) => rqt.obj_result_question_type)
  @JoinColumn({
    name: 'question_type_id',
  })
  obj_result_question_type: ResultQuestionType;

  @OneToMany(() => ResultAnswer, (rq) => rq.obj_result_question)
  obj_result_question: ResultAnswer[];
}
