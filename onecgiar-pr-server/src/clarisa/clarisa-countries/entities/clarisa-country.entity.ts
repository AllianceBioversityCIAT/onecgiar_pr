import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { Auditable } from '../../../shared/entities/auditableEntity';

@Entity('clarisa_countries')
export class ClarisaCountry extends Auditable {

    @Column({
        name: 'id',
        type: 'int',
        primary: true
    })
    id: number;

    @Column({
        name: 'name',
        type: 'text'
    })
    name: string;

    @Column({
        name: 'iso_alpha_2',
        type: 'text'
    })
    iso_alpha_2: string;

    @Column({
        name: 'iso_alpha_3',
        type: 'text'
    })
    iso_alpha_3: string;

}
