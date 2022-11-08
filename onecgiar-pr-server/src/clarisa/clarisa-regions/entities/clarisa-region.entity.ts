import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('clarisa_regions')
export class ClarisaRegion {
  @PrimaryGeneratedColumn()
  um49Code: number;

  @Column({
    type: 'text',
    name: 'name',
  })
  name: string;

  @ManyToOne(() => ClarisaRegion, (cr) => cr.um49Code, { nullable: true })
  @JoinColumn({
    name: 'parent_regions_code',
  })
  parent_regions_code: number;
}
