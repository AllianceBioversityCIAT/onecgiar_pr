import { ClarisaInstitution } from "../../../../clarisa/clarisa-institutions/entities/clarisa-institution.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { LegacyResult } from "../../legacy-result/entities/legacy-result.entity";

@Entity('legacy_indicators_partners')
export class LegacyIndicatorsPartner {
    @PrimaryGeneratedColumn({
        type: 'bigint',
        name: 'id'
    })
    id: number;

    @ManyToOne(() =>
        LegacyResult, (r) => r.legacy_id,
        { nullable: true }
    )
    @JoinColumn({
        name: 'legacy_id',
    })
    legacy_id: string;

    @Column({
        name: 'year',
        type: 'int',
        nullable: true,
    })
    year: number;

    @ManyToOne(() =>
        ClarisaInstitution, (cc) => cc.id,
        { nullable: true }
    )
    @JoinColumn({
        name: 'clarisa_id',
    })
    clarisa_id: number;

    @Column({
        name: 'name',
        type: 'mediumtext',
        nullable: true,
    })
    name: number;

    @Column({
        name: 'acronym',
        type: 'varchar',
        length: 45,
        nullable: true
    })
    acronym: number;
}
