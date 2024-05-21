import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
      ],
      useFactory: async (configService: ConfigService) =>
        new DataSource({
          type: 'mysql',
          host: configService.get('AUTOMATION_DB_HOST'),
          port: parseInt(configService.get('DB_PORT')),
          username: configService.get('AUTOMATION_DB_USER_NAME'),
          password: configService.get('AUTOMATION_DB_USER_PASS'),
          database: configService.get('AUTOMATION_DB_NAME'),
          entities: [
            `${__dirname}/../../api/**/*.entity{.ts,.js}`,
            `${__dirname}/../../auth/**/*.entity{.ts,.js}`,
            `${__dirname}/../../clarisa/**/*.entity{.ts,.js}`,
            `${__dirname}/../../toc/**/*.entity{.ts,.js}`,
          ],
          synchronize: false,
          migrationsRun: false,
          logging: false,
          migrations: [`${__dirname}/migrations/**/*{.ts,.js}`],
          migrationsTableName: 'migrations',
          metadataTableName: 'orm_metadata',
        }).options,
      inject: [ConfigService],
    }),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class TestModule {}
