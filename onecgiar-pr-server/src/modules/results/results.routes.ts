import { Routes } from '@nestjs/core';
import { ResultsModule } from './results.module';

export const resultsRoutes: Routes = [
    {
        path:'',
        module:ResultsModule
    }
];