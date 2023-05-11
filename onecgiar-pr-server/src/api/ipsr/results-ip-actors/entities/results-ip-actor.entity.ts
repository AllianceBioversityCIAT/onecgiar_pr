import { PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Entity } from 'typeorm';
import { Ipsr } from '../../entities/ipsr.entity';
import { Version } from '../../../results/versions/entities/version.entity';
import { ActorType } from '../../../results/result-actors/entities/actor-type.entity';
import { BaseEntity } from '../../../../shared/entities/base-entity';

@Entity('result_ip_result_actors')
export class ResultsIpActor extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'result_ip_actors_id',
        type: 'bigint'
    })
    result_ip_actors_id: number;

    @Column({
        name: 'women',
        type: 'bigint',
        nullable: true
    })
    women!: number;

    @Column({
        name: 'women_youth',
        type: 'bigint',
        nullable: true
    })
    women_youth!: number;

    @Column({
        name: 'men',
        type: 'bigint',
        nullable: true
    })
    men!: number;

    @Column({
        name: 'men_youth',
        type: 'bigint',
        nullable: true
    })
    men_youth!: number;

    @Column({
        name: 'result_ip_result_id',
        type: 'bigint',
        nullable: false
    })
    result_ip_result_id: number;

    @Column({
        name: 'actor_type_id',
        type: 'bigint',
        nullable: true
    })
    actor_type_id!: number;

    @Column({
        name: 'other_actor_type',
        type: 'text',
        nullable: true
    })
    other_actor_type!: string;

    @Column({
        name: 'evidence_link',
        type: 'text',
        nullable: true
    })
    evidence_link!: string;

    @ManyToOne(() => Ipsr, ir => ir.obj_result_ip_actors)
    @JoinColumn({
        name: 'result_ip_result_id'
    })
    obj_result_ip_result_id: Ipsr;

    @ManyToOne(() => Version, v => v.result_ip_actor)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

    @ManyToOne(() => ActorType, at => at.result_ip_actor)
    @JoinColumn({
        name: 'actor_type_id'
    })
    obj_actor_type: ActorType;
}
