import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ResultQuestion } from '../../result-questions/entities/result-question.entity';

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

  @OneToMany(() => ResultQuestion, (rq) => rq.obj_result_type)
  obj_result_type: ResultQuestion[];
  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: true,
    default: true,
  })
  isActive!: boolean;
}
