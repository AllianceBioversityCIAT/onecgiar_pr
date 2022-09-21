import { Injectable } from '@nestjs/common';
import { CreateResultsByInititiativeDto } from './dto/create-results_by_inititiative.dto';
import { UpdateResultsByInititiativeDto } from './dto/update-results_by_inititiative.dto';

@Injectable()
export class ResultsByInititiativesService {
  create(createResultsByInititiativeDto: CreateResultsByInititiativeDto) {
    return 'This action adds a new resultsByInititiative';
  }

  findAll() {
    return `This action returns all resultsByInititiatives`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultsByInititiative`;
  }

  update(id: number, updateResultsByInititiativeDto: UpdateResultsByInititiativeDto) {
    return `This action updates a #${id} resultsByInititiative`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultsByInititiative`;
  }
}
