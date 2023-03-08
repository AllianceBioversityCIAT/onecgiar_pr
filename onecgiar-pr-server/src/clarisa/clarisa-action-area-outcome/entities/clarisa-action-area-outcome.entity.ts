import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ShareResultInnovationPackageRequest } from '../../../api/ipsr/share-result-innovation-package-request/entities/share-result-innovation-package-request.entity';

@Entity('clarisa_action_area_outcome')
export class ClarisaActionAreaOutcome {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'outcomeSMOcode',
        type: 'text',
        nullable: true
    })
    outcomeSMOcode: string;

    @Column({
        name: 'outcomeStatement',
        type: 'text',
        nullable: true
    })
    outcomeStatement: string;

    @OneToMany(() => ShareResultInnovationPackageRequest, srip => srip.obj_action_area_outcome)
    share_result_innovation_package_request: ShareResultInnovationPackageRequest[];

}