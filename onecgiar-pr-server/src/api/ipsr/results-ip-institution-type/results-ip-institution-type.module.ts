import { Module } from '@nestjs/common';
import { ResultsIpInstitutionTypeService } from './results-ip-institution-type.service';
import { ResultsIpInstitutionTypeController } from './results-ip-institution-type.controller';
import { ReturnResponse } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsIpInstitutionTypeController],
  providers: [ResultsIpInstitutionTypeService, ReturnResponse],
})
export class ResultsIpInstitutionTypeModule {}
