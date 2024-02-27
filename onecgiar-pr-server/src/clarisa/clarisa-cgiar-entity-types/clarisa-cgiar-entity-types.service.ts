import { Injectable } from '@nestjs/common';
import { CreateClarisaCgiarEntityTypeDto } from './dto/create-clarisa-cgiar-entity-type.dto';
import { UpdateClarisaCgiarEntityTypeDto } from './dto/update-clarisa-cgiar-entity-type.dto';

@Injectable()
export class ClarisaCgiarEntityTypesService {
  create(createClarisaCgiarEntityTypeDto: CreateClarisaCgiarEntityTypeDto) {
    return 'This action adds a new clarisaCgiarEntityType';
  }

  findAll() {
    return `This action returns all clarisaCgiarEntityTypes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaCgiarEntityType`;
  }

  update(id: number, updateClarisaCgiarEntityTypeDto: UpdateClarisaCgiarEntityTypeDto) {
    return `This action updates a #${id} clarisaCgiarEntityType`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaCgiarEntityType`;
  }
}
