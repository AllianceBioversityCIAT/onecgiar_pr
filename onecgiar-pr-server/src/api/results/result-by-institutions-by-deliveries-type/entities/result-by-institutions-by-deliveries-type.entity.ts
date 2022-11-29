import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { PartnerDeliveryType } from '../../partner-delivery-type/entities/partner-delivery-type.entity';
import { ResultsByInstitution } from '../../results_by_institutions/entities/results_by_institution.entity';
import { Version } from '../../versions/entities/version.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('result_by_institutions_by_deliveries_type')
export class ResultByInstitutionsByDeliveriesType {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => PartnerDeliveryType, pd => pd.id, {nullable: false})
    @JoinColumn({
        name: 'partner_delivery_type_id'
    })
    partner_delivery_type_id: number;

    @ManyToOne(() => ResultsByInstitution, ri => ri.id, {nullable: false})
    @JoinColumn({
        name: 'result_by_institution_id'
    })
    result_by_institution_id: number;

    @Column({
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        default: true
    })
    is_active: boolean;

    @ManyToOne(() => Version, v => v.id, { nullable: false })
    @JoinColumn({
        name: 'versions_id',
    })
    versions_id: number;

    @ManyToOne(() => User, u => u.id, { nullable: false })
    @JoinColumn({
        name: 'created_by'
    })
    created_by: number;

    @CreateDateColumn({
        name: 'created_date',
        type: 'timestamp'
    })
    created_date: Date;

    @ManyToOne(() => User, u => u.id, {nullable: true})
    @JoinColumn({
        name: 'last_updated_by'
    })
    last_updated_by: number;

    @UpdateDateColumn({
        name: 'last_updated_date',
        type: 'timestamp'
    })
    last_updated_date: Date;


}
