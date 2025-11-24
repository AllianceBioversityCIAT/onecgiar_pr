import { Module } from '@nestjs/common';
import { IpsrFrameworkService } from './ipsr-framework.service';
import { IpsrFrameworkController } from './ipsr-framework.controller';
import { IpsrGeneralInformationModule } from './ipsr_general_information/ipsr_general_information.module';

@Module({
  controllers: [IpsrFrameworkController],
  providers: [IpsrFrameworkService],
  imports: [IpsrGeneralInformationModule],
})
export class IpsrFrameworkModule {}
