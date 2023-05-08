import { Injectable } from '@nestjs/common';
import { CreateClarisaSdgDto } from './dto/create-clarisa-sdg.dto';
import { UpdateClarisaSdgDto } from './dto/update-clarisa-sdg.dto';

@Injectable()
export class ClarisaSdgsService {
  create(createClarisaSdgDto: CreateClarisaSdgDto) {
    return 'This action adds a new clarisaSdg';
  }

  findAll() {
    return `This action returns all clarisaSdgs`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaSdg`;
  }

  update(id: number, updateClarisaSdgDto: UpdateClarisaSdgDto) {
    return `This action updates a #${id} clarisaSdg`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaSdg`;
  }
}
