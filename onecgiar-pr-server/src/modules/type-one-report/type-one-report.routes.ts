import { Routes } from '@nestjs/core';
import { TypeOneReport } from './entities/type-one-report.entity';

export const typeOneReportRoutes: Routes = [
    {
        path:'',
        module: TypeOneReport
    }
];