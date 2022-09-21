import { Injectable } from '@nestjs/common';
import { CreateInititiativeDto } from './dto/create-inititiative.dto';
import { UpdateInititiativeDto } from './dto/update-inititiative.dto';

@Injectable()
export class InititiativesService {
  create(createInititiativeDto: CreateInititiativeDto) {
    return 'This action adds a new inititiative';
  }

  findAll() {
    return `This action returns all inititiatives`;
  }

  findOne(id: number) {
    return `This action returns a #${id} inititiative`;
  }

  update(id: number, updateInititiativeDto: UpdateInititiativeDto) {
    return `This action updates a #${id} inititiative`;
  }

  remove(id: number) {
    return `This action removes a #${id} inititiative`;
  }
}
