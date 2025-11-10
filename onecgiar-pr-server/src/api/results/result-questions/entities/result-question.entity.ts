import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResultType } from '../../result_types/entities/result_type.entity';
import { ResultAnswer } from './result-answers.entity';
import { ResultQuestionType } from './result-question-types.entity';

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
    nullable: true,
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

  @Column({
    name: 'version',
    type: 'enum',
    enum: ['P22', 'P25'],
    nullable: true,
  })
  version: 'P22' | 'P25';

  @Column({
    name: 'previous_question_id',
    type: 'bigint',
    nullable: true,
  })
  previous_question_id: number;

  @ManyToOne(() => ResultType, (rqt) => rqt.obj_result_type)
  @JoinColumn({
    name: 'result_type_id',
  })
  obj_result_type: ResultQuestionType;

  // Relation with the same entity primary key
  @ManyToOne(() => ResultQuestion, (ciet) => ciet.result_question_id)
  @JoinColumn({ name: 'parent_question_id' })
  obj_parent_question_id: ResultQuestion[];

  @ManyToOne(() => ResultQuestion, (ciet) => ciet.result_question_id)
  @JoinColumn({ name: 'previous_question_id' })
  obj_previous_question_id: ResultQuestion[];

  @OneToMany(() => ResultAnswer, (rq) => rq.obj_result_question)
  obj_result_question: ResultAnswer[];
}
