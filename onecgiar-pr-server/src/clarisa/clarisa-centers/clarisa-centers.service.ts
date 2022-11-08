import { Injectable } from '@nestjs/common';
import { CreateClarisaCenterDto } from './dto/create-clarisa-center.dto';
import { UpdateClarisaCenterDto } from './dto/update-clarisa-center.dto';

@Injectable()
export class ClarisaCentersService {
  create(createClarisaCenterDto: CreateClarisaCenterDto) {
    return 'This action adds a new clarisaCenter';
  }

  findAll() {
    return `This action returns all clarisaCenters`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaCenter`;
  }

  update(id: number, updateClarisaCenterDto: UpdateClarisaCenterDto) {
    return `This action updates a #${id} clarisaCenter`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaCenter`;
  }
}
