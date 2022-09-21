import { Injectable } from '@nestjs/common';
import { CreateResultTypeDto } from './dto/create-result_type.dto';
import { UpdateResultTypeDto } from './dto/update-result_type.dto';

@Injectable()
export class ResultTypesService {
  create(createResultTypeDto: CreateResultTypeDto) {
    return 'This action adds a new resultType';
  }

  findAll() {
    return `This action returns all resultTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultType`;
  }

  update(id: number, updateResultTypeDto: UpdateResultTypeDto) {
    return `This action updates a #${id} resultType`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultType`;
  }
}
