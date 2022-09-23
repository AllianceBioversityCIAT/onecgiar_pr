import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { Version } from "../../versions/entities/version.entity";

@Entity('evidence')
export class Evidence {
    @PrimaryGeneratedColumn({
        name: 'id',
        type: 'bigint'
    })
    id: number;

    @Column({ 
        name: 'link', 
        type: 'varchar', 
        length: 100,
        nullable: false 
    })
    link: number;

    @Column({
        name: 'description',
        type: 'text',
        nullable: true
    })
    description!: string;

    @Column({
        name: 'is_active',
        type: 'tinyint',
        nullable: false
    })
    is_active: number;

    @ManyToOne(() => Version, v => v.id, { nullable: false })
    @JoinColumn({
        name: 'version_id'
    })
    version_id: number;

    @ManyToOne(() => User, u => u.id, { nullable: false })
    @JoinColumn({
        name: 'created_by'
    })
    created_by: number;

    @CreateDateColumn({
        name: 'creation_date',
        nullable: false
    })
    creation_date: Date;

    @ManyToOne(() => User, u => u.id, { nullable: true })
    @JoinColumn({
        name: 'last_updated_by'
    })
    last_updated_by: number;

    @UpdateDateColumn({
        name: 'last_updated_date',
        nullable: true
    })
    last_updated_date!: Date;
}
