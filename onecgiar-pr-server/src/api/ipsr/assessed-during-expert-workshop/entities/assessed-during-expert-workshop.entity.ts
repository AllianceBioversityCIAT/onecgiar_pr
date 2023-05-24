import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('assessed_during_expert_workshop')
export class AssessedDuringExpertWorkshop {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: true,
  })
  name: string;
}
