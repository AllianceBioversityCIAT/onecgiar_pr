import { Injectable } from '@nestjs/common';
import { CreateClarisaGlobalTargetDto } from './dto/create-clarisa-global-target.dto';
import { UpdateClarisaGlobalTargetDto } from './dto/update-clarisa-global-target.dto';

@Injectable()
export class ClarisaGlobalTargetService {
  create(createClarisaGlobalTargetDto: CreateClarisaGlobalTargetDto) {
    return createClarisaGlobalTargetDto;
  }

  findAll() {
    return `This action returns all clarisaGlobalTarget`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaGlobalTarget`;
  }

  update(
    id: number,
    updateClarisaGlobalTargetDto: UpdateClarisaGlobalTargetDto,
  ) {
    return `This action updates a #${id} clarisaGlobalTarget ${updateClarisaGlobalTargetDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaGlobalTarget`;
  }
}
