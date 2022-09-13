import { Injectable } from '@nestjs/common';
import { CreateClarisaActionAreaDto } from './dto/create-clarisa-action-area.dto';
import { UpdateClarisaActionAreaDto } from './dto/update-clarisa-action-area.dto';

@Injectable()
export class ClarisaActionAreasService {
  create(createClarisaActionAreaDto: CreateClarisaActionAreaDto) {
    return 'This action adds a new clarisaActionArea';
  }

  findAll() {
    return `This action returns all clarisaActionAreas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaActionArea`;
  }

  update(id: number, updateClarisaActionAreaDto: UpdateClarisaActionAreaDto) {
    return `This action updates a #${id} clarisaActionArea`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaActionArea`;
  }
}
