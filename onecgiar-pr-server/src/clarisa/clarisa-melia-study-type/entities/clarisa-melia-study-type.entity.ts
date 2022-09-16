import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_melia_study_type')
export class ClarisaMeliaStudyType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'text' })
  name: string;
}
