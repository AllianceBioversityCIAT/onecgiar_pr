import { Controller } from '@nestjs/common';
import { ResultsIpInstitutionTypeService } from './results-ip-institution-type.service';

@Controller('results-ip-institution-type')
export class ResultsIpInstitutionTypeController {
  constructor(
    private readonly resultsIpInstitutionTypeService: ResultsIpInstitutionTypeService,
  ) {}
}
