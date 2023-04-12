import { Injectable } from '@nestjs/common';
import { CreateResultsInnovationPackagesEnablerTypeDto } from './dto/create-results-innovation-packages-enabler-type.dto';
import { UpdateResultsInnovationPackagesEnablerTypeDto } from './dto/update-results-innovation-packages-enabler-type.dto';

@Injectable()
export class ResultsInnovationPackagesEnablerTypeService {
  create(createResultsInnovationPackagesEnablerTypeDto: CreateResultsInnovationPackagesEnablerTypeDto) {
    return 'This action adds a new resultsInnovationPackagesEnablerType';
  }

  findAll() {
    return `This action returns all resultsInnovationPackagesEnablerType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsInnovationPackagesEnablerType`;
  }

  update(id: number, updateResultsInnovationPackagesEnablerTypeDto: UpdateResultsInnovationPackagesEnablerTypeDto) {
    return `This action updates a #${id} resultsInnovationPackagesEnablerType`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsInnovationPackagesEnablerType`;
  }
}
