import { Routes } from "@nestjs/core";
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './modules/home/home.module';
import { ResultsModule } from './modules/results/results.module';
import { TypeOneReportModule } from './modules/type-one-report/type-one-report.module';

export const MainRoutes: Routes = [
    {
        path: 'auth',
        module: AuthModule
    },
    {
        path: 'home',
        module: HomeModule
    },
    {
        path: 'results',
        module: ResultsModule
    },
    {
        path: 'type-one-report',
        module: TypeOneReportModule
    }
];