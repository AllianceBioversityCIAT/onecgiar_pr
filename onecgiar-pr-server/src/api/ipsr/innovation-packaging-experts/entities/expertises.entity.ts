import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('expertises')
export class Expertises {
  @PrimaryGeneratedColumn({
    name: 'expertises_id',
    type: 'bigint',
  })
  expertises_id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description: string;

  @Column({
    type: 'int',
    nullable: true,
    name: 'order',
  })
  order: number;
}
