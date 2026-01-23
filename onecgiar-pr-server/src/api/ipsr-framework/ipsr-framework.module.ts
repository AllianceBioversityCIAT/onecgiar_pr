import { Module } from '@nestjs/common';
import { IpsrFrameworkService } from './ipsr-framework.service';
import { IpsrFrameworkController } from './ipsr-framework.controller';
import { IpsrGeneralInformationModule } from './ipsr_general_information/ipsr_general_information.module';
import { PathwayModule } from './pathway/pathway.module';
import { IpsrContributorsPartnersModule } from './ipsr_contributors-partners/ipsr_contributors-partners.module';

@Module({
  controllers: [IpsrFrameworkController],
  providers: [IpsrFrameworkService],
  imports: [
    IpsrGeneralInformationModule,
    PathwayModule,
    IpsrContributorsPartnersModule,
  ],
})
export class IpsrFrameworkModule {}
