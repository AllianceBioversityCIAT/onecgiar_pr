import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../shared/entities/base-entity';
import { Result } from '../../entities/result.entity';
import { Version } from '../../versions/entities/version.entity';
import { ActorType } from './actor-type.entity';

@Entity('result_actors')
export class ResultActor extends BaseEntity{

    @PrimaryGeneratedColumn({
        name: 'result_actors_id',
        type: 'bigint'
    })
    result_actors_id: number;

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
        name: 'result_id',
        type: 'bigint'
    })
    result_id: number;

    @Column({
        name: 'actor_type_id',
        type: 'bigint',
        nullable: true
    })
    actor_type_id!: number;


    @ManyToOne(() => Result, r => r.obj_result_actor)
    @JoinColumn({
        name: 'result_id'
    })
    obj_result: Result;

    @ManyToOne(() => Version, v => v.result_actor)
    @JoinColumn({
        name: 'version_id'
    })
    obj_version: Version;

    @ManyToOne(() => ActorType, at => at.result_actor)
    @JoinColumn({
        name: 'actor_type_id'
    })
    obj_actor_type: ActorType;
}
