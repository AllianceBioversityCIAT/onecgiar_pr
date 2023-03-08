import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ShareResultInnovationPackageRequest } from '../../../ipsr/share-result-innovation-package-request/entities/share-result-innovation-package-request.entity';

@Entity('request_status')
export class RequestStatus{

    @PrimaryGeneratedColumn({
        name: 'request_status_id'
    })
    request_status_id: number;

    @Column({
        name: 'name',
        type: 'text',
        nullable: true
    })
    name!: string;

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description!: string;

    @OneToMany(() => ShareResultInnovationPackageRequest, srip => srip.obj_request_status)
    share_result_innovation_package_request: ShareResultInnovationPackageRequest[];

}