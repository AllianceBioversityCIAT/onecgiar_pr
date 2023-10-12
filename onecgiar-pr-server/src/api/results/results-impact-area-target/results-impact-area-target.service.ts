import { Injectable } from '@nestjs/common';
import { CreateResultsImpactAreaTargetDto } from './dto/create-results-impact-area-target.dto';
import { UpdateResultsImpactAreaTargetDto } from './dto/update-results-impact-area-target.dto';

@Injectable()
export class ResultsImpactAreaTargetService {
  create(createResultsImpactAreaTargetDto: CreateResultsImpactAreaTargetDto) {
    return 'This action adds a new resultsImpactAreaTarget';
  }

  findAll() {
    return `This action returns all resultsImpactAreaTarget`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsImpactAreaTarget`;
  }

  update(
    id: number,
    updateResultsImpactAreaTargetDto: UpdateResultsImpactAreaTargetDto,
  ) {
    return `This action updates a #${id} resultsImpactAreaTarget`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsImpactAreaTarget`;
  }
}
