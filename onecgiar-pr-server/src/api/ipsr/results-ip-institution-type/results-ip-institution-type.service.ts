import { Injectable } from '@nestjs/common';
import { CreateResultsIpInstitutionTypeDto } from './dto/create-results-ip-institution-type.dto';
import { UpdateResultsIpInstitutionTypeDto } from './dto/update-results-ip-institution-type.dto';

@Injectable()
export class ResultsIpInstitutionTypeService {
  create(createResultsIpInstitutionTypeDto: CreateResultsIpInstitutionTypeDto) {
    return 'This action adds a new resultsIpInstitutionType';
  }

  findAll() {
    return `This action returns all resultsIpInstitutionType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsIpInstitutionType`;
  }

  update(id: number, updateResultsIpInstitutionTypeDto: UpdateResultsIpInstitutionTypeDto) {
    return `This action updates a #${id} resultsIpInstitutionType`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsIpInstitutionType`;
  }
}
