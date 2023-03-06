import { Injectable } from '@nestjs/common';
import { CreateResultsPackageTocResultDto } from './dto/create-results-package-toc-result.dto';
import { UpdateResultsPackageTocResultDto } from './dto/update-results-package-toc-result.dto';

@Injectable()
export class ResultsPackageTocResultService {
  create(createResultsPackageTocResultDto: CreateResultsPackageTocResultDto) {
    return 'This action adds a new resultsPackageTocResult';
  }

  findAll() {
    return `This action returns all resultsPackageTocResult`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsPackageTocResult`;
  }

  update(id: number, updateResultsPackageTocResultDto: UpdateResultsPackageTocResultDto) {
    return `This action updates a #${id} resultsPackageTocResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsPackageTocResult`;
  }
}
