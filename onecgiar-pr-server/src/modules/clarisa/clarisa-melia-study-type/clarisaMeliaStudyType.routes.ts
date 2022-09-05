import { Routes } from '@nestjs/core';
import { ClarisaMeliaStudyTypeModule } from './clarisa-melia-study-type.module';

export const ClarisaMeliaStudyTypeRoutes: Routes = [
    {
        path:'',
        module: ClarisaMeliaStudyTypeModule
    }
];