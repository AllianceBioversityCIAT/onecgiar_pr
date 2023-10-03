import { Injectable } from '@nestjs/common';
import { CreateResultsPackageByInitiativeDto } from './dto/create-results-package-by-initiative.dto';
import { UpdateResultsPackageByInitiativeDto } from './dto/update-results-package-by-initiative.dto';

@Injectable()
export class ResultsPackageByInitiativesService {
  create(
    createResultsPackageByInitiativeDto: CreateResultsPackageByInitiativeDto,
  ) {
    return 'This action adds a new resultsPackageByInitiative';
  }

  findAll() {
    return `This action returns all resultsPackageByInitiatives`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsPackageByInitiative`;
  }

  update(
    id: number,
    updateResultsPackageByInitiativeDto: UpdateResultsPackageByInitiativeDto,
  ) {
    return `This action updates a #${id} resultsPackageByInitiative`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsPackageByInitiative`;
  }
}
