import { Module } from '@nestjs/common';
import { ResultByInstitutionsByDeliveriesTypeService } from './result-by-institutions-by-deliveries-type.service';
import { ResultByInstitutionsByDeliveriesTypeController } from './result-by-institutions-by-deliveries-type.controller';
import { ResultByInstitutionsByDeliveriesTypeRepository } from './result-by-institutions-by-deliveries-type.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultByInstitutionsByDeliveriesTypeController],
  providers: [ResultByInstitutionsByDeliveriesTypeService, ResultByInstitutionsByDeliveriesTypeRepository, HandlersError],
  exports: [
    ResultByInstitutionsByDeliveriesTypeRepository
  ]
})
export class ResultByInstitutionsByDeliveriesTypeModule {}
