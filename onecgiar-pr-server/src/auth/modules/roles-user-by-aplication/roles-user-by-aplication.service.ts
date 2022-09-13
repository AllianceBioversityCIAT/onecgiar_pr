import { Injectable } from '@nestjs/common';
import { CreateRolesUserByAplicationDto } from './dto/create-roles-user-by-aplication.dto';
import { UpdateRolesUserByAplicationDto } from './dto/update-roles-user-by-aplication.dto';
import { Repository } from 'typeorm';
import { RolesUserByAplication } from './entities/roles-user-by-aplication.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from '../role/entities/role.entity';

@Injectable()
export class RolesUserByAplicationService {
  constructor(
    @InjectRepository(RolesUserByAplication)
    private readonly _roleByAplicationRepository: Repository<RolesUserByAplication>,
    @InjectRepository(Role)
    private readonly _roleRepository: Repository<Role>,
  ) {}

  async createAplicationRol(
    createRolesUserByAplicationDto: CreateRolesUserByAplicationDto,
  ) {
    console.log(createRolesUserByAplicationDto);

    try {
      const seRole = await this._roleRepository.findOne({
        where: { id: createRolesUserByAplicationDto.role_id },
      });
      const newRole = await this._roleByAplicationRepository.save({
        user: createRolesUserByAplicationDto.user_id,
        role: seRole,
      });
      console.log(newRole);
      return newRole;
    } catch (error) {
      console.log(error);
      return 'error';
    }
  }

  findAll() {
    return `This action returns all rolesUserByAplication`;
  }

  findOne(id: number) {
    return `This action returns a #${id} rolesUserByAplication`;
  }

  update(
    id: number,
    updateRolesUserByAplicationDto: UpdateRolesUserByAplicationDto,
  ) {
    return `This action updates a #${id} rolesUserByAplication`;
  }

  remove(id: number) {
    return `This action removes a #${id} rolesUserByAplication`;
  }
}
