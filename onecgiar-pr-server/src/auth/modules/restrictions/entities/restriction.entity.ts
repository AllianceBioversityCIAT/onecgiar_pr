import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('restriction')
export class Restriction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'endpoint',
    nullable: true,
    type: 'text',
  })
  endpoint!: string;

  @Column({
    name: 'action',
    nullable: true,
    type: 'text',
  })
  action!: string;

  @Column({
    name: 'description',
    nullable: true,
    type: 'text',
  })
  description!: string;

  @Column({
    name: 'active',
    type: 'boolean',
    default: true,
  })
  active: boolean;

  @Column({
    name: 'is_back',
    type: 'boolean',
    default: false,
  })
  is_back: boolean;
}
