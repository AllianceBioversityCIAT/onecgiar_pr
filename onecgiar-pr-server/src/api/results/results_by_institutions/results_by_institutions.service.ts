import { Injectable } from '@nestjs/common';
import { CreateResultsByInstitutionDto } from './dto/create-results_by_institution.dto';
import { UpdateResultsByInstitutionDto } from './dto/update-results_by_institution.dto';

@Injectable()
export class ResultsByInstitutionsService {
  create(createResultsByInstitutionDto: CreateResultsByInstitutionDto) {
    return 'This action adds a new resultsByInstitution';
  }

  findAll() {
    return `This action returns all resultsByInstitutions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsByInstitution`;
  }

  update(id: number, updateResultsByInstitutionDto: UpdateResultsByInstitutionDto) {
    return `This action updates a #${id} resultsByInstitution`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByInstitution`;
  }
}
