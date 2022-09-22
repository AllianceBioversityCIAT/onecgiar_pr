import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clarisa_regions_types')
export class ClarisaRegionType {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'name',
        type: 'text'
    })
    name: string;

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description!: string;

}
