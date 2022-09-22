import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from '../../../shared/entities/auditableEntity';

@Entity('clarisa_melia_study_type')
export class ClarisaMeliaStudyType extends Auditable{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'name', type: 'text' })
  name: string;
}
