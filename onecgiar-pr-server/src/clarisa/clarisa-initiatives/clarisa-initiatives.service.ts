import { Injectable } from '@nestjs/common';
import { CreateClarisaInitiativeDto } from './dto/create-clarisa-initiative.dto';
import { UpdateClarisaInitiativeDto } from './dto/update-clarisa-initiative.dto';

@Injectable()
export class ClarisaInitiativesService {
  create(createClarisaInitiativeDto: CreateClarisaInitiativeDto) {
    return createClarisaInitiativeDto;
  }

  findAll() {
    return `This action returns all clarisaInitiatives`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaInitiative`;
  }

  update(id: number, updateClarisaInitiativeDto: UpdateClarisaInitiativeDto) {
    return `This action updates a #${id} clarisaInitiative ${updateClarisaInitiativeDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaInitiative`;
  }
}
