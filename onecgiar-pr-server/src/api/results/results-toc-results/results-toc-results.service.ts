import { Injectable } from '@nestjs/common';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { UpdateResultsTocResultDto } from './dto/update-results-toc-result.dto';

@Injectable()
export class ResultsTocResultsService {
  create(createResultsTocResultDto: CreateResultsTocResultDto) {
    return 'This action adds a new resultsTocResult';
  }

  findAll() {
    return `This action returns all resultsTocResults`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsTocResult`;
  }

  update(id: number, updateResultsTocResultDto: UpdateResultsTocResultDto) {
    return `This action updates a #${id} resultsTocResult`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsTocResult`;
  }
}
