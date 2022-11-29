import { Injectable } from '@nestjs/common';
import { CreateClarisaActionAreaOutcomesActionAreaDto } from './dto/create-clarisa-action-area-outcomes-action-area.dto';
import { UpdateClarisaActionAreaOutcomesActionAreaDto } from './dto/update-clarisa-action-area-outcomes-action-area.dto';

@Injectable()
export class ClarisaActionAreaOutcomesActionAreaService {
  create(createClarisaActionAreaOutcomesActionAreaDto: CreateClarisaActionAreaOutcomesActionAreaDto) {
    return 'This action adds a new clarisaActionAreaOutcomesActionArea';
  }

  findAll() {
    return `This action returns all clarisaActionAreaOutcomesActionArea`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaActionAreaOutcomesActionArea`;
  }

  update(id: number, updateClarisaActionAreaOutcomesActionAreaDto: UpdateClarisaActionAreaOutcomesActionAreaDto) {
    return `This action updates a #${id} clarisaActionAreaOutcomesActionArea`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaActionAreaOutcomesActionArea`;
  }
}
