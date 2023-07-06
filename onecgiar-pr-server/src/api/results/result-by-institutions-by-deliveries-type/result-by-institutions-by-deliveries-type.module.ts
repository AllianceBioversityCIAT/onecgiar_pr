import { Module } from '@nestjs/common';
import { ResultByInstitutionsByDeliveriesTypeService } from './result-by-institutions-by-deliveries-type.service';
import { ResultByInstitutionsByDeliveriesTypeController } from './result-by-institutions-by-deliveries-type.controller';
import { ResultByInstitutionsByDeliveriesTypeRepository } from './result-by-institutions-by-deliveries-type.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultByInstitutionsByDeliveriesTypeController],
  providers: [
    ResultByInstitutionsByDeliveriesTypeService,
    ResultByInstitutionsByDeliveriesTypeRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [ResultByInstitutionsByDeliveriesTypeRepository],
})
export class ResultByInstitutionsByDeliveriesTypeModule {}
