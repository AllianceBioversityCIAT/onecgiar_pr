import { Module } from '@nestjs/common';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { IpsrContributorsPartnersController } from './ipsr_contributors-partners.controller';

@Module({
  controllers: [IpsrContributorsPartnersController],
  providers: [IpsrContributorsPartnersService],
})
export class IpsrContributorsPartnersModule {}
