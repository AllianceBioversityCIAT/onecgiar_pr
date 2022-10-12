import { Injectable } from '@nestjs/common';
import { CreateResultsByInstitutionTypeDto } from './dto/create-results_by_institution_type.dto';
import { UpdateResultsByInstitutionTypeDto } from './dto/update-results_by_institution_type.dto';

@Injectable()
export class ResultsByInstitutionTypesService {
  create(createResultsByInstitutionTypeDto: CreateResultsByInstitutionTypeDto) {
    return createResultsByInstitutionTypeDto;
  }

  findAll() {
    return `This action returns all resultsByInstitutionTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsByInstitutionType`;
  }

  update(
    id: number,
    updateResultsByInstitutionTypeDto: UpdateResultsByInstitutionTypeDto,
  ) {
    return `This action updates a #${id} resultsByInstitutionType ${updateResultsByInstitutionTypeDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByInstitutionType`;
  }
}
