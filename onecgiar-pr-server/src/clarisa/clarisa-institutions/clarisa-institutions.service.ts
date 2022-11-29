import { Injectable } from '@nestjs/common';
import { CreateClarisaInstitutionDto } from './dto/create-clarisa-institution.dto';
import { UpdateClarisaInstitutionDto } from './dto/update-clarisa-institution.dto';

@Injectable()
export class ClarisaInstitutionsService {
  create(createClarisaInstitutionDto: CreateClarisaInstitutionDto) {
    return createClarisaInstitutionDto;
  }

  findAll() {
    return `This action returns all clarisaInstitutions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInstitution`;
  }

  update(id: number, updateClarisaInstitutionDto: UpdateClarisaInstitutionDto) {
    return `This action updates a #${id} clarisaInstitution ${updateClarisaInstitutionDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInstitution`;
  }
}
