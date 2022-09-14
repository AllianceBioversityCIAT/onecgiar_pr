import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ComplementaryDataUserService } from '../complementary-data-user/complementary-data-user.service';
import { Repository, JoinColumn } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateComplementaryDataUserDto } from '../complementary-data-user/dto/create-complementary-data-user.dto';
import { ComplementaryDataUser } from '../complementary-data-user/entities/complementary-data-user.entity';
import { Role } from '../role/entities/role.entity';
import { RoleService } from '../role/role.service';
import { RolesUserByAplicationService } from '../roles-user-by-aplication/roles-user-by-aplication.service';
import { retunrFormatUser } from './dto/return-create-user.dto';

@Injectable()
export class UserService {
  private readonly cgiarRegex: RegExp = /cgiar\.org/g;

  constructor(
    @InjectRepository(User)
    private readonly _userRepository: Repository<User>,
    private readonly _complementaryDataUserService: ComplementaryDataUserService,
    private readonly _roleByAplicationService: RolesUserByAplicationService,
  ) {}

  create(createUserDto: CreateUserDto) {
    return createUserDto;
  }

  async createFull(
    createUserDto: CreateUserDto,
    createFullUserDto: CreateComplementaryDataUserDto,
    role: number,
  ): Promise<retunrFormatUser> {
    try {
      createFullUserDto.is_cgiar = this.cgiarRegex.test(createUserDto.email);
      const user = await this.findOneByEmail(createUserDto.email);
      if (user) {
        throw {
            response: {},
            message: 'Duplicates have been found in the data',
            status: HttpStatus.BAD_REQUEST
          }
      }

      if (!createFullUserDto.is_cgiar) {
        if (!('password' in createFullUserDto)) {
          console.log(1, !createFullUserDto.password);
          if (!createFullUserDto.password) {
            throw {
              response: {},
              message: 'No password provider',
              status: HttpStatus.BAD_REQUEST
            }
          }
        }
      }

      const newUser: User = await this._userRepository.save(createUserDto);
      const newRole = await this._roleByAplicationService.createAplicationRol({
        role_id: role,
        user_id: newUser.id,
        active: true,
      });
      createFullUserDto.user_id = newUser.id;
      const newFullUser: any = await this._complementaryDataUserService.create(
        createFullUserDto,
      );
      let result = newUser;
      if (newFullUser?.status) {
        result = newFullUser;
      }

      return {
        response: result,
        message: 'User successfully created',
        status: HttpStatus.CREATED
      }
    } catch (error) {
      return error;
    }
  }

  findAll() {
    return `This action returns all user`;
  }

  async findOne(id: number) {
    try {
      const user: User = await this._userRepository.findOne({
        where: { id: id },
      });
      return user;
    } catch (error) {
      return 'error';
    }
  }

  async findOneByEmail(email: string) {
    try {
      const user: User = await this._userRepository.findOne({
        where: { email: email },
      });
      return user;
    } catch (error) {
      return error;
    }
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
