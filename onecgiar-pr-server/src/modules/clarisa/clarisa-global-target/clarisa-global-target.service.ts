import { Injectable } from '@nestjs/common';
import { CreateClarisaGlobalTargetDto } from './dto/create-clarisa-global-target.dto';
import { UpdateClarisaGlobalTargetDto } from './dto/update-clarisa-global-target.dto';

@Injectable()
export class ClarisaGlobalTargetService {
  create(createClarisaGlobalTargetDto: CreateClarisaGlobalTargetDto) {
    return 'This action adds a new clarisaGlobalTarget';
  }

  findAll() {
    return `This action returns all clarisaGlobalTarget`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaGlobalTarget`;
  }

  update(id: number, updateClarisaGlobalTargetDto: UpdateClarisaGlobalTargetDto) {
    return `This action updates a #${id} clarisaGlobalTarget`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaGlobalTarget`;
  }
}
