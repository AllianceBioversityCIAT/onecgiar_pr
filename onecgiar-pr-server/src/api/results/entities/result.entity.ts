import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { GenderTagLevel } from "../gender_tag_levels/entities/gender_tag_level.entity";
import { ResultLevel } from "../result_levels/entities/result_level.entity";
import { ResultType } from "../result_types/entities/result_type.entity";
import { User } from "../users/entities/user.entity";
import { Version } from "../versions/entities/version.entity";

@Entity()
export class Result {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: number;

    @Column({ name: 'title', type: 'varchar', length: 45, nullable: false })
    title: string;

    @Column({ name: 'description', type: 'text' })
    description: string;

    @ManyToOne(() => ResultLevel, rl => rl.id)
    @JoinColumn({ name: 'result_level_id' })
    result_level_id: number;

    @ManyToOne(() => ResultType, rt => rt.id)
    @JoinColumn({ name: 'result_type_id' })
    result_type_id: string;

    @ManyToOne(() => GenderTagLevel, gtl => gtl.id)
    @JoinColumn({ name: 'gender_tag_level_id' })
    gender_tag_level_id: number;

    @Column({ name: 'is_active', type: 'tinyint', nullable: false })
    is_active: number;

    @ManyToOne(() => Version, v => v.id, { nullable: false })
    @JoinColumn({ name: 'version_id' })
    version_id: number;

    @ManyToOne(() => User, u => u.id, { nullable: false })
    @JoinColumn({ name: 'created_by' })
    created_by: number;

    @Column({ name: 'created_date', type: 'timestamp', nullable: false })
    created_date: Date;

    @ManyToOne(() => User, u => u.id)
    @JoinColumn({ name: 'last_updated_by' })
    last_updated_by: number;

    @Column({ name: 'last_updated_date', type: 'timestamp' })
    last_updated_date: number;
}
