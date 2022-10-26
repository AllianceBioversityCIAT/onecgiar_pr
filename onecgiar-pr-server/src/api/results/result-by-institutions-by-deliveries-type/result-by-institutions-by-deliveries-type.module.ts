import { Module } from '@nestjs/common';
import { ResultByInstitutionsByDeliveriesTypeService } from './result-by-institutions-by-deliveries-type.service';
import { ResultByInstitutionsByDeliveriesTypeController } from './result-by-institutions-by-deliveries-type.controller';

@Module({
  controllers: [ResultByInstitutionsByDeliveriesTypeController],
  providers: [ResultByInstitutionsByDeliveriesTypeService]
})
export class ResultByInstitutionsByDeliveriesTypeModule {}
