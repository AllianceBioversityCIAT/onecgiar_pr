import { Routes } from '@nestjs/core';
import { BiReportsModule } from './bi-reports/bi-reports.module';

export const ResultDashboardBIRoutes:Routes = [
    {
        path:'bi-reports',
        module:BiReportsModule
    }
]