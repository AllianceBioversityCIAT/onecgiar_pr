import { Injectable } from '@nestjs/common';
import { CreateRoleByUserDto } from './dto/create-role-by-user.dto';
import { UpdateRoleByUserDto } from './dto/update-role-by-user.dto';

@Injectable()
export class RoleByUserService {
  create(createRoleByUserDto: CreateRoleByUserDto) {
    return 'This action adds a new roleByUser';
  }

  findAll() {
    return `This action returns all roleByUser`;
  }

  findOne(id: number) {
    return `This action returns a #${id} roleByUser`;
  }

  update(id: number, updateRoleByUserDto: UpdateRoleByUserDto) {
    return `This action updates a #${id} roleByUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} roleByUser`;
  }
}
