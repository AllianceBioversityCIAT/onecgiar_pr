import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from '../../../shared/entities/auditableEntity';

@Entity('clarisa_regions_types')
export class ClarisaRegionType extends Auditable {

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

    @Column({
        name: 'active',
        type: 'boolean',
        default: true
    })
    active: boolean;
}
