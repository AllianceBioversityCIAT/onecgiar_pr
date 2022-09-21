import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Result } from "../../entities/result.entity";
import { Inititiative } from "../../inititiatives/entities/inititiative.entity";
import { User } from "../../users/entities/user.entity";
import { Version } from "../../versions/entities/version.entity";

@Entity()
export class ResultsByInititiative {
    @ManyToOne(() => Result, r => r.id)
    @PrimaryColumn({ name: 'result_id', type: 'bigint' })
    resultId: number;
    
    @ManyToOne(() => Inititiative, i => i.id)
    @PrimaryColumn({ name: 'inititiative_id', type: 'bigint' })
    inititiative_id: number;

    @Column({ name: 'role', type: 'bigint' })
    role: number;

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
    lastUpdatedDate: Date;
}
