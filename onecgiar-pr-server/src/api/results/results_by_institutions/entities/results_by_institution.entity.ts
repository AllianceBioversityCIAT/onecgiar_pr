import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Version } from "../../versions/entities/version.entity";

@Entity()
export class ResultsByInstitution {
    @PrimaryGeneratedColumn({ name: 'results_id', type: 'bigint' })
    results_id: number;

    @Column({ name: 'institutions_id', type: 'int', nullable: false })
    institutions_id: number;

    @Column({ name: 'institution_roles_id', type: 'bigint', nullable: false })
    institution_roles_id: number;

    // @ManyToOne(() => Institution, i => i.id, { nullable: false })
    // @JoinColumn({ name: 'institution_roles_id' })
    // institution_roles_id: number;

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
    last_updated_date: Date;

}
