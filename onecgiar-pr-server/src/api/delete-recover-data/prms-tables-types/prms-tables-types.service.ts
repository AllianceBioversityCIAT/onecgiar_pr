import { Injectable } from '@nestjs/common';
import { CreatePrmsTablesTypeDto } from './dto/create-prms-tables-type.dto';
import { UpdatePrmsTablesTypeDto } from './dto/update-prms-tables-type.dto';

@Injectable()
export class PrmsTablesTypesService {
  create(createPrmsTablesTypeDto: CreatePrmsTablesTypeDto) {
    return 'This action adds a new prmsTablesType';
  }

  findAll() {
    return `This action returns all prmsTablesTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} prmsTablesType`;
  }

  update(id: number, updatePrmsTablesTypeDto: UpdatePrmsTablesTypeDto) {
    return `This action updates a #${id} prmsTablesType`;
  }

  remove(id: number) {
    return `This action removes a #${id} prmsTablesType`;
  }
}
