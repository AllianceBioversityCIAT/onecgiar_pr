import { Module } from '@nestjs/common';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { IpsrContributorsPartnersController } from './ipsr_contributors-partners.controller';
import { ContributorsPartnersModule } from '../../results-framework-reporting/contributors-partners/contributors-partners.module';

@Module({
  controllers: [IpsrContributorsPartnersController],
  providers: [IpsrContributorsPartnersService],
  imports: [ContributorsPartnersModule],
})
export class IpsrContributorsPartnersModule {}
