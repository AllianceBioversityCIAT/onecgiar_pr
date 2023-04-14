import { Module } from '@nestjs/common';
import { ResultsIpInstitutionTypeService } from './results-ip-institution-type.service';
import { ResultsIpInstitutionTypeController } from './results-ip-institution-type.controller';

@Module({
  controllers: [ResultsIpInstitutionTypeController],
  providers: [ResultsIpInstitutionTypeService]
})
export class ResultsIpInstitutionTypeModule {}
