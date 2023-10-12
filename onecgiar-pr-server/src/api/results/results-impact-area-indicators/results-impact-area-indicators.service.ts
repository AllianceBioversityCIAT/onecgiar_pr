import { Injectable } from '@nestjs/common';
import { CreateResultsImpactAreaIndicatorDto } from './dto/create-results-impact-area-indicator.dto';
import { UpdateResultsImpactAreaIndicatorDto } from './dto/update-results-impact-area-indicator.dto';

@Injectable()
export class ResultsImpactAreaIndicatorsService {
  create(
    createResultsImpactAreaIndicatorDto: CreateResultsImpactAreaIndicatorDto,
  ) {
    return 'This action adds a new resultsImpactAreaIndicator';
  }

  findAll() {
    return `This action returns all resultsImpactAreaIndicators`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsImpactAreaIndicator`;
  }

  update(
    id: number,
    updateResultsImpactAreaIndicatorDto: UpdateResultsImpactAreaIndicatorDto,
  ) {
    return `This action updates a #${id} resultsImpactAreaIndicator`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsImpactAreaIndicator`;
  }
}
