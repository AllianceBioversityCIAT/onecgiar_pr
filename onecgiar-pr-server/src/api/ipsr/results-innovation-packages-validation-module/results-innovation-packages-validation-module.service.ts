import { Injectable } from '@nestjs/common';
import { CreateResultsInnovationPackagesValidationModuleDto } from './dto/create-results-innovation-packages-validation-module.dto';
import { UpdateResultsInnovationPackagesValidationModuleDto } from './dto/update-results-innovation-packages-validation-module.dto';

@Injectable()
export class ResultsInnovationPackagesValidationModuleService {
  create(createResultsInnovationPackagesValidationModuleDto: CreateResultsInnovationPackagesValidationModuleDto) {
    return 'This action adds a new resultsInnovationPackagesValidationModule';
  }

  findAll() {
    return `This action returns all resultsInnovationPackagesValidationModule`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsInnovationPackagesValidationModule`;
  }

  update(id: number, updateResultsInnovationPackagesValidationModuleDto: UpdateResultsInnovationPackagesValidationModuleDto) {
    return `This action updates a #${id} resultsInnovationPackagesValidationModule`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsInnovationPackagesValidationModule`;
  }
}
