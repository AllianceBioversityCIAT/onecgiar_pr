import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Auditable } from '../../../shared/entities/auditableEntity';
import { ClarisaRegionType } from '../../region-types/entities/clarisa-region-type.entity';

@Entity('clarisa_regions')
export class ClarisaRegion extends Auditable {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'iso_numeric',
        nullable: true,
        type: 'int'
    })
    iso_numeric!: number;

    @Column({
        name: 'acronym',
        nullable: true,
        type: 'text'
    })
    acronym!: string;

    @ManyToOne(() => ClarisaRegionType, (rgt) => rgt.id, {nullable: true})
    @JoinColumn({
        name: 'region_type_id'
    })
    region_type_id: number;

    @ManyToOne(() => ClarisaRegion, (cr) => cr.id, {nullable: true})
    @JoinColumn({
        name: 'parent_id'
    })
    parent_id: number;

    @Column({
        name: 'active',
        type: 'boolean',
        default: true
    })
    active: boolean;
}
