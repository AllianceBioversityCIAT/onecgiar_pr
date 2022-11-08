import { Injectable } from '@nestjs/common';
import { CreateClarisaInstitutionsTypeDto } from './dto/create-clarisa-institutions-type.dto';
import { UpdateClarisaInstitutionsTypeDto } from './dto/update-clarisa-institutions-type.dto';

@Injectable()
export class ClarisaInstitutionsTypeService {
  create(createClarisaInstitutionsTypeDto: CreateClarisaInstitutionsTypeDto) {
    return createClarisaInstitutionsTypeDto;
  }

  findAll() {
    return `This action returns all clarisaInstitutionsType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInstitutionsType`;
  }

  update(
    id: number,
    updateClarisaInstitutionsTypeDto: UpdateClarisaInstitutionsTypeDto,
  ) {
    return `This action updates a #${id} clarisaInstitutionsType ${updateClarisaInstitutionsTypeDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInstitutionsType`;
  }
}
