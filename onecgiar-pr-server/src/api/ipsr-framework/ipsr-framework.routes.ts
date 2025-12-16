import { Routes } from '@nestjs/core';
import { IpsrGeneralInformationModule } from './ipsr_general_information/ipsr_general_information.module';
import { PathwayModule } from './pathway/pathway.module';
import { IpsrContributorsPartnersModule } from './ipsr_contributors-partners/ipsr_contributors-partners.module';

export const IpsrFrameworkRoutes: Routes = [
    {
        path: 'ipsr-general-information',
        module: IpsrGeneralInformationModule,
    },
    {
        path: 'ipsr-pathway',
        module: PathwayModule,
    },
    {
        path: 'ipsr-contributors-partners',
        module: IpsrContributorsPartnersModule,
    },
];

