import { Routes } from '@nestjs/core';
import {AuthModule} from './auth.module';

export const AuthRoutes: Routes = [
    {
        path:'',
        module: AuthModule
    }
];