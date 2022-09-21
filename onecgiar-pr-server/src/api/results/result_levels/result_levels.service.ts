import { Injectable } from '@nestjs/common';
import { CreateResultLevelDto } from './dto/create-result_level.dto';
import { UpdateResultLevelDto } from './dto/update-result_level.dto';

@Injectable()
export class ResultLevelsService {
  create(createResultLevelDto: CreateResultLevelDto) {
    return 'This action adds a new resultLevel';
  }

  findAll() {
    return `This action returns all resultLevels`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultLevel`;
  }

  update(id: number, updateResultLevelDto: UpdateResultLevelDto) {
    return `This action updates a #${id} resultLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultLevel`;
  }
}
