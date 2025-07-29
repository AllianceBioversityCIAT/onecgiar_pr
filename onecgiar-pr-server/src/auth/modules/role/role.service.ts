import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly _roleRepository: Repository<Role>) {}

  create(createRoleDto: CreateRoleDto) {
    try {
      this._roleRepository.create();
    } catch (_error) {
      return createRoleDto;
    }
  }

  async findAll(): Promise<{ id: number; descripcion: string }[]> {
    return this._roleRepository
      .createQueryBuilder('role')
      .select(['role.id', 'role.description'])
      .where('role.id NOT IN (:...excludedIds)', { excludedIds: [1, 2] })
      .getRawMany();
  }

  findOne(id: number) {
    return `This action returns a #${id} role`;
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return `This action updates a #${id} role ${updateRoleDto}`;
  }

  remove(id: number) {
    return `This action removes a #${id} role`;
  }
}
