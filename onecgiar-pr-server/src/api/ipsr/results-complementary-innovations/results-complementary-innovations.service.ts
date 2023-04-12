import { Injectable } from '@nestjs/common';
import { CreateResultsComplementaryInnovationDto } from './dto/create-results-complementary-innovation.dto';
import { UpdateResultsComplementaryInnovationDto } from './dto/update-results-complementary-innovation.dto';

@Injectable()
export class ResultsComplementaryInnovationsService {
  create(createResultsComplementaryInnovationDto: CreateResultsComplementaryInnovationDto) {
    return 'This action adds a new resultsComplementaryInnovation';
  }

  findAll() {
    return `This action returns all resultsComplementaryInnovations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsComplementaryInnovation`;
  }

  update(id: number, updateResultsComplementaryInnovationDto: UpdateResultsComplementaryInnovationDto) {
    return `This action updates a #${id} resultsComplementaryInnovation`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsComplementaryInnovation`;
  }
}
