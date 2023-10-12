import { Injectable } from '@nestjs/common';
import { CreateResultsComplementaryInnovationsFunctionDto } from './dto/create-results-complementary-innovations-function.dto';
import { UpdateResultsComplementaryInnovationsFunctionDto } from './dto/update-results-complementary-innovations-function.dto';

@Injectable()
export class ResultsComplementaryInnovationsFunctionsService {
  create(
    createResultsComplementaryInnovationsFunctionDto: CreateResultsComplementaryInnovationsFunctionDto,
  ) {
    return 'This action adds a new resultsComplementaryInnovationsFunction';
  }

  findAll() {
    return `This action returns all resultsComplementaryInnovationsFunctions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsComplementaryInnovationsFunction`;
  }

  update(
    id: number,
    updateResultsComplementaryInnovationsFunctionDto: UpdateResultsComplementaryInnovationsFunctionDto,
  ) {
    return `This action updates a #${id} resultsComplementaryInnovationsFunction`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsComplementaryInnovationsFunction`;
  }
}
