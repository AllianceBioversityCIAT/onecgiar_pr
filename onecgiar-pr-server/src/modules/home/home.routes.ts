import { Routes } from '@nestjs/core';
import { HomeModule } from './home.module';

export const homeRoutes: Routes = [
    {
        path:'',
        module:HomeModule
    }
];