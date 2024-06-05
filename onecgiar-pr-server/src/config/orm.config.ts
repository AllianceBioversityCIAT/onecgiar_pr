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
    `${__dirname}/../api/**/*.entity{.ts,.js}`,
    `${__dirname}/../auth/**/*.entity{.ts,.js}`,
    `${__dirname}/../clarisa/**/*.entity{.ts,.js}`,
    `${__dirname}/../toc/**/*.entity{.ts,.js}`,
    `${__dirname}/../result-dashboard-bi/**/*.entity{.ts,.js}`,
  ],
  synchronize: false,
  migrationsRun: false,
  logging: false,
  migrations: [`${__dirname}/../migrations/**/*{.ts,.js}`],
  migrationsTableName: 'migrations',
  metadataTableName: 'orm_metadata',
});
