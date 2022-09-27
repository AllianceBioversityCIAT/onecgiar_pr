import { Injectable } from '@nestjs/common';
import { CreateRoleLevelDto } from './dto/create-role-level.dto';
import { UpdateRoleLevelDto } from './dto/update-role-level.dto';

@Injectable()
export class RoleLevelsService {
  create(createRoleLevelDto: CreateRoleLevelDto) {
    return 'This action adds a new roleLevel';
  }

  findAll() {
    return `This action returns all roleLevels`;
  }

  findOne(id: number) {
    return `This action returns a #${id} roleLevel`;
  }

  update(id: number, updateRoleLevelDto: UpdateRoleLevelDto) {
    return `This action updates a #${id} roleLevel`;
  }

  remove(id: number) {
    return `This action removes a #${id} roleLevel`;
  }
}
