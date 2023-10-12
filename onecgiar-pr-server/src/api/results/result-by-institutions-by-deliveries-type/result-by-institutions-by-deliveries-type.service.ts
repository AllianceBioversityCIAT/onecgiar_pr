import { Injectable } from '@nestjs/common';
import { CreateResultByInstitutionsByDeliveriesTypeDto } from './dto/create-result-by-institutions-by-deliveries-type.dto';
import { UpdateResultByInstitutionsByDeliveriesTypeDto } from './dto/update-result-by-institutions-by-deliveries-type.dto';

@Injectable()
export class ResultByInstitutionsByDeliveriesTypeService {
  create(
    createResultByInstitutionsByDeliveriesTypeDto: CreateResultByInstitutionsByDeliveriesTypeDto,
  ) {
    return 'This action adds a new resultByInstitutionsByDeliveriesType';
  }

  findAll() {
    return `This action returns all resultByInstitutionsByDeliveriesType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultByInstitutionsByDeliveriesType`;
  }

  update(
    id: number,
    updateResultByInstitutionsByDeliveriesTypeDto: UpdateResultByInstitutionsByDeliveriesTypeDto,
  ) {
    return `This action updates a #${id} resultByInstitutionsByDeliveriesType`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultByInstitutionsByDeliveriesType`;
  }
}
