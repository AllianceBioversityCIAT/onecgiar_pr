import { Module } from '@nestjs/common';
import { IpsrGeneralInformationService } from './ipsr_general_information.service';
import { IpsrGeneralInformationController } from './ipsr_general_information.controller';

@Module({
  controllers: [IpsrGeneralInformationController],
  providers: [IpsrGeneralInformationService],
})
export class IpsrGeneralInformationModule {}
