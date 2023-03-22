import { Injectable } from '@nestjs/common';
import { CreateClarisaSdgsTargetDto } from './dto/create-clarisa-sdgs-target.dto';
import { UpdateClarisaSdgsTargetDto } from './dto/update-clarisa-sdgs-target.dto';

@Injectable()
export class ClarisaSdgsTargetsService {
  create(createClarisaSdgsTargetDto: CreateClarisaSdgsTargetDto) {
    return 'This action adds a new clarisaSdgsTarget';
  }

  findAll() {
    return `This action returns all clarisaSdgsTargets`;
  }

  findOne(id: number) {
    return `This action returns a #${id} clarisaSdgsTarget`;
  }

  update(id: number, updateClarisaSdgsTargetDto: UpdateClarisaSdgsTargetDto) {
    return `This action updates a #${id} clarisaSdgsTarget`;
  }

  remove(id: number) {
    return `This action removes a #${id} clarisaSdgsTarget`;
  }
}
