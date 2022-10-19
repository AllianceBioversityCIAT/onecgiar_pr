import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_action_area')
export class ClarisaActionArea {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'text' })
  name: string;

  @Column({ name: 'description', type: 'text' })
  description: string;
}
