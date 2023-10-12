import { Injectable } from '@nestjs/common';
import { CreateResultsInvestmentDiscontinuedOptionDto } from './dto/create-results-investment-discontinued-option.dto';
import { UpdateResultsInvestmentDiscontinuedOptionDto } from './dto/update-results-investment-discontinued-option.dto';

@Injectable()
export class ResultsInvestmentDiscontinuedOptionsService {
  create(
    createResultsInvestmentDiscontinuedOptionDto: CreateResultsInvestmentDiscontinuedOptionDto,
  ) {
    return 'This action adds a new resultsInvestmentDiscontinuedOption';
  }

  findAll() {
    return `This action returns all resultsInvestmentDiscontinuedOptions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsInvestmentDiscontinuedOption`;
  }

  update(
    id: number,
    updateResultsInvestmentDiscontinuedOptionDto: UpdateResultsInvestmentDiscontinuedOptionDto,
  ) {
    return `This action updates a #${id} resultsInvestmentDiscontinuedOption`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsInvestmentDiscontinuedOption`;
  }
}
