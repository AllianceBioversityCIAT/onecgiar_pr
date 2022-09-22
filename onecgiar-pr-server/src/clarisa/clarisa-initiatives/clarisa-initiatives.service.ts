import { Injectable } from '@nestjs/common';
import { CreateClarisaInitiativeDto } from './dto/create-clarisa-initiative.dto';
import { UpdateClarisaInitiativeDto } from './dto/update-clarisa-initiative.dto';

@Injectable()
export class ClarisaInitiativesService {
  create(createClarisaInitiativeDto: CreateClarisaInitiativeDto) {
    return 'This action adds a new clarisaInitiative';
  }

  findAll() {
    return `This action returns all clarisaInitiatives`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInitiative`;
  }

  update(id: number, updateClarisaInitiativeDto: UpdateClarisaInitiativeDto) {
    return `This action updates a #${id} clarisaInitiative`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInitiative`;
  }
}
