import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MainRoutes } from './main.routes';
import { ResultsModule } from './modules/results/results.module';
import { HomeModule } from './modules/home/home.module';
import { TypeOneReportModule } from './modules/type-one-report/type-one-report.module';

@Module({
  imports: [
    AuthModule,
    HomeModule,
    ResultsModule,
    TypeOneReportModule,
    RouterModule.register(MainRoutes),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
