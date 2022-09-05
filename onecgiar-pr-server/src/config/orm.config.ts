import 'dotenv/config';
import { DataSource } from 'typeorm';
import { env } from 'process';

export const dataSource: DataSource = new DataSource({
    type: 'mysql',
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT), 
    username: env.DB_USER_NAME,
    password: env.DB_USER_PASS,
    database: env.DB_NAME,
    entities: [
        `${__dirname}/../modules/**/*.entity{.ts,.js}`,
        `${__dirname}/../auth/**/*.entity{.ts,.js}`
    ],
    synchronize: false,
    migrationsRun: false,
    logging: true,
    migrations: [
        ``
    ],
    migrationsTableName: 'migrations',
    metadataTableName: 'orm_metadata'
});