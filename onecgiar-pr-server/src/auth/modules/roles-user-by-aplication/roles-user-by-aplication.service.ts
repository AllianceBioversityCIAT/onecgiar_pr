import { Injectable } from '@nestjs/common';
import { CreateRolesUserByAplicationDto } from './dto/create-roles-user-by-aplication.dto';
import { UpdateRolesUserByAplicationDto } from './dto/update-roles-user-by-aplication.dto';
import { Repository } from 'typeorm';
import { RolesUserByAplication } from './entities/roles-user-by-aplication.entity';

@Injectable()
export class RolesUserByAplicationService {

  constructor(
    private readonly _roleByAplicationRepository: Repository<RolesUserByAplication>
  ){}

  async create(createRolesUserByAplicationDto: CreateRolesUserByAplicationDto) {
    console.log(createRolesUserByAplicationDto)
    try {
      const newRole = await this._roleByAplicationRepository.save(createRolesUserByAplicationDto);
      console.log(newRole)
      return newRole;
    } catch (error) {
      console.log(error)
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
