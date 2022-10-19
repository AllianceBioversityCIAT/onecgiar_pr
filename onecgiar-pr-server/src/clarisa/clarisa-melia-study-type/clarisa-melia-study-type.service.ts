import { Injectable } from '@nestjs/common';
import { CreateClarisaMeliaStudyTypeDto } from './dto/create-clarisa-melia-study-type.dto';
import { UpdateClarisaMeliaStudyTypeDto } from './dto/update-clarisa-melia-study-type.dto';

@Injectable()
export class ClarisaMeliaStudyTypeService {
  create(createClarisaMeliaStudyTypeDto: CreateClarisaMeliaStudyTypeDto) {
    return createClarisaMeliaStudyTypeDto;
  }

  findAll() {
    return `This action returns all clarisaMeliaStudyType`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaMeliaStudyType`;
  }

  update(
    id: number,
    updateClarisaMeliaStudyTypeDto: UpdateClarisaMeliaStudyTypeDto,
  ) {
    return `This action updates a #${id} clarisaMeliaStudyType ${updateClarisaMeliaStudyTypeDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaMeliaStudyType`;
  }
}
