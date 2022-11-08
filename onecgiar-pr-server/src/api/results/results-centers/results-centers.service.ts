import { Injectable } from '@nestjs/common';
import { CreateResultsCenterDto } from './dto/create-results-center.dto';
import { UpdateResultsCenterDto } from './dto/update-results-center.dto';

@Injectable()
export class ResultsCentersService {
  create(createResultsCenterDto: CreateResultsCenterDto) {
    return 'This action adds a new resultsCenter';
  }

  findAll() {
    return `This action returns all resultsCenters`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsCenter`;
  }

  update(id: number, updateResultsCenterDto: UpdateResultsCenterDto) {
    return `This action updates a #${id} resultsCenter`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsCenter`;
  }
}
