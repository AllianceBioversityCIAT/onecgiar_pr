import { Injectable } from '@nestjs/common';
import { CreateResultsInnovationPackagesEnablerTypeDto } from './dto/create-results-innovation-packages-enabler-type.dto';
import { UpdateResultsInnovationPackagesEnablerTypeDto } from './dto/update-results-innovation-packages-enabler-type.dto';
import { ComplementaryInnovationEnablerTypesRepository } from './repositories/complementary-innovation-enabler-types.repository';
import { ResultsInnovationPackagesEnablerTypeRepository } from './repositories/results-innovation-packages-enabler-type.repository';
import { HandlersError } from 'src/shared/handlers/error.utils';

@Injectable()
export class ResultsInnovationPackagesEnablerTypeService {

  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ComplementaryInnovationEnablerTypesRepository,
    private readonly _ipsrReposotory: ResultsInnovationPackagesEnablerTypeRepository,
  ) { }
  create(createResultsInnovationPackagesEnablerTypeDto: CreateResultsInnovationPackagesEnablerTypeDto) {
    return 'This action adds a new resultsInnovationPackagesEnablerType';
  }

  findAll() {
    return this._resultRepository.getAllComplementaryInnovationsType();
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
