import { Column } from 'typeorm';
import { BaseEntity } from './base-entity';

export abstract class BaseEntityControlList extends BaseEntity {
  @Column({
    name: 'justification',
    type: 'text',
    nullable: true,
  })
  justification!: string;
}
