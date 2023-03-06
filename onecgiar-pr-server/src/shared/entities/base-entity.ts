import {
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  
  export abstract class BaseEntity {
  
    @Column({
      name: 'is_active',
      type: 'boolean',
      default: true,
      nullable: false
    })
    is_active: boolean;
  
    @Column({
      name: 'version_id',
      type: 'bigint',
      nullable: false
    })
    version_id: number;
  
    @CreateDateColumn({
      name: 'create_date',
      type: 'timestamp',
      nullable: false,
    })
    create_date: Date;
  
    @UpdateDateColumn({
      name: 'last_update_date',
      type: 'timestamp',
      nullable: true,
    })
    last_update_date!: Date;
  
    @Column({
      name: 'create_by',
      type: 'bigint',
      nullable: true,
    })
    create_by!: number;
  
    @Column({
      name: 'last_update_by',
      type: 'bigint',
      nullable: true,
    })
    last_update_by!: number;
  }
  