import { Controller } from '@nestjs/common';
import { ResultByInstitutionsByDeliveriesTypeService } from './result-by-institutions-by-deliveries-type.service';

@Controller('result-by-institutions-by-deliveries-type')
export class ResultByInstitutionsByDeliveriesTypeController {
  constructor(
    private readonly resultByInstitutionsByDeliveriesTypeService: ResultByInstitutionsByDeliveriesTypeService,
  ) {}
}
