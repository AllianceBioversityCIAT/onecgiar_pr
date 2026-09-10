import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleLevelId } from './role-level-id.enum';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly _roleRepository: Repository<Role>,
  ) {}

  create(createRoleDto: CreateRoleDto) {
    try {
      this._roleRepository.create();
    } catch (_error) {
      return createRoleDto;
    }
  }

  /**
   * P2-2043: the level is now a parameter so the User Management filters can ask for the
   * Application-level roles (Admin / Guest) as well as the Initiative-level ones.
   *
   * The default stays 2 (Initiative) ON PURPOSE: every existing caller - the role dropdowns in the
   * manage-user modal among them - calls this with no argument and must keep receiving exactly the
   * same list it received before. This extends the endpoint, it does not change it.
   */
  async findAll(
    levelId: number = RoleLevelId.INITIATIVE,
  ): Promise<{ id: number; descripcion: string }[]> {
    return this._roleRepository
      .createQueryBuilder('role')
      .select(['role.id', 'role.description'])
      .where('role.active = :active', { active: true })
      .andWhere('role.role_level_id = :levelId', { levelId })
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
