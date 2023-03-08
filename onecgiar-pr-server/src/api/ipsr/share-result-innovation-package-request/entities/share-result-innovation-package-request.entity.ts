import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { ResultInnovationPackage } from '../../result-innovation-package/entities/result-innovation-package.entity';
import { ClarisaInitiative } from '../../../../clarisa/clarisa-initiatives/entities/clarisa-initiative.entity';
import { TocResult } from '../../../../toc/toc-results/entities/toc-result.entity';
import { ClarisaActionAreaOutcome } from '../../../../clarisa/clarisa-action-area-outcome/entities/clarisa-action-area-outcome.entity';
import { RequestStatus } from '../../../results/share-result-request/entities/request-status.entity';
import { User } from '../../../../auth/modules/user/entities/user.entity';

@Entity('share_result_innovation_package_request')
export class ShareResultInnovationPackageRequest{
    @PrimaryGeneratedColumn({
        name: 'share_result_innovation_package_request_id',
        type: 'bigint' 
    })
    share_result_innovation_package_request_id: number;

    @Column({//
        name: 'result_package_id',
        type: 'bigint'
    })
    result_package_id: number;

    @Column({//
        name: 'owner_initiative_id',
        type: 'bigint'
    })
    owner_initiative_id: number;

    @Column({//
        name: 'shared_inititiative_id',
        type: 'bigint'
    })
    shared_inititiative_id: number;

    @Column({//
        name: 'approving_inititiative_id',
        type: 'bigint'
    })
    approving_inititiative_id: number;

    @Column({//
        name: 'toc_result_id',
        type: 'bigint',
        nullable: true
    })
    toc_result_id!: number;

    @Column({//
        name: 'action_area_outcome_id',
        type: 'bigint',
        nullable: true
    })
    action_area_outcome_id!: number;

    @Column({//
        name: 'request_status_id',
        type: 'bigint'
    })
    request_status_id: number;

    @Column({//
        name: 'requested_by',
        type: 'bigint'
    })
    requested_by: number;

    @Column({//
        name: 'approved_by',
        type: 'bigint',
        nullable: true
    })
    approved_by: number;

    @Column({
        name: 'planned_result',
        type: 'boolean',
        nullable: true
    })
    planned_result!: boolean;

    @Column({//
        name: 'requester_initiative_id',
        type: 'bigint',
        nullable: true
    })
    requester_initiative_id!: number;

    @CreateDateColumn({
        name: 'requested_date',
        type: 'timestamp'
    })
    requested_date: Date;

    @Column({
        name: 'aprovaed_date',
        type: 'timestamp',
        nullable: true
    })
    aprovaed_date!: Date;

    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true
    })
    is_active: boolean;

    //-----------------------------

    @ManyToOne(() => ResultInnovationPackage, rip => rip.share_result_innovation_package_request)
    @JoinColumn({
        name: 'result_package_id'
    })
    obj_result_package: ResultInnovationPackage;

    @ManyToOne(() => ClarisaInitiative, ci => ci.obj_owner_initiative)
    @JoinColumn({
        name: 'owner_initiative_id'
    })
    obj_owner_initiative: ClarisaInitiative;

    @ManyToOne(() => ClarisaInitiative, ci => ci.obj_shared_inititiative)
    @JoinColumn({
        name: 'shared_inititiative_id'
    })
    obj_shared_inititiative: ClarisaInitiative;

    @ManyToOne(() => ClarisaInitiative, ci => ci.obj_approving_inititiative)
    @JoinColumn({
        name: 'approving_inititiative_id'
    })
    obj_approving_inititiative: ClarisaInitiative;

    @ManyToOne(() => ClarisaInitiative, ci => ci.obj_requester_initiative)
    @JoinColumn({
        name: 'requester_initiative_id'
    })
    obj_requester_initiative!: ClarisaInitiative;

    @ManyToOne(() => TocResult, tr => tr.share_result_innovation_package_request)
    @JoinColumn({
        name: 'toc_result_id'
    })
    obj_toc_result!: TocResult;

    @ManyToOne(() => ClarisaActionAreaOutcome, caao => caao.share_result_innovation_package_request)
    @JoinColumn({
        name: 'action_area_outcome_id'
    })
    obj_action_area_outcome!: ClarisaActionAreaOutcome;

    @ManyToOne(() => RequestStatus, rs => rs.share_result_innovation_package_request)
    @JoinColumn({
        name: 'request_status_id'
    })
    obj_request_status: RequestStatus;

    @ManyToOne(() => User, u => u.obj_requested_by)
    @JoinColumn({
        name: 'requested_by'
    })
    obj_requested_by: User;

    @ManyToOne(() => User, u => u.obj_approved_by)
    @JoinColumn({
        name: 'approved_by'
    })
    obj_approved_by: User;
}
