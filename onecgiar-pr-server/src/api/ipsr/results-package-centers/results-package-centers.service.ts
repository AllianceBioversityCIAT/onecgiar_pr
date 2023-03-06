import { Injectable } from '@nestjs/common';
import { CreateResultsPackageCenterDto } from './dto/create-results-package-center.dto';
import { UpdateResultsPackageCenterDto } from './dto/update-results-package-center.dto';

@Injectable()
export class ResultsPackageCentersService {
  create(createResultsPackageCenterDto: CreateResultsPackageCenterDto) {
    return 'This action adds a new resultsPackageCenter';
  }

  findAll() {
    return `This action returns all resultsPackageCenters`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsPackageCenter`;
  }

  update(id: number, updateResultsPackageCenterDto: UpdateResultsPackageCenterDto) {
    return `This action updates a #${id} resultsPackageCenter`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsPackageCenter`;
  }
}
