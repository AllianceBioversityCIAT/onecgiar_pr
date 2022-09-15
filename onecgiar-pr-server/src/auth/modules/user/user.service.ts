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
import { UserRepository } from './repositories/user.repository';
import { FullUserRequestDto } from './dto/full-user-request.dto';

@Injectable()
export class UserService {
  private readonly cgiarRegex: RegExp = /cgiar\.org/g;

  constructor(
    @InjectRepository(User)
    private readonly _userRepository: Repository<User>,
    private readonly _customUserRespository: UserRepository,
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
      if (user.response) {
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

  async findAll():Promise<retunrFormatUser>  {
    try {
      const user: User[] = await this._userRepository.find();
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'User not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  async findAllFull():Promise<retunrFormatUser>  {
    try {
      const user: FullUserRequestDto[] = await this._customUserRespository.completeAllData()
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'User not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  async findOne(id: number):Promise<retunrFormatUser> {
    try {
      const user: User = await this._userRepository.findOne({
        where: { id: id },
      });
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'User not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  async findOneByEmail(email: string):Promise<retunrFormatUser> {
    try {
      const user: User = await this._userRepository.findOne({
        where: { email: email },
      });
      return {
        response: user,
        message: 'Successful response',
        status: HttpStatus.OK
      };
    } catch (error) {
      return {
        response: {},
        message: 'User not found',
        status: HttpStatus.NOT_FOUND
      };
    }
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
