import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { CreateComplementaryDataUserDto } from './dto/create-complementary-data-user.dto';
import { UpdateComplementaryDataUserDto } from './dto/update-complementary-data-user.dto';
import { ComplementaryDataUser } from './entities/complementary-data-user.entity';
import { UserRepository } from '../user/repositories/user.repository';
import { FullUserRequestDto } from '../user/dto/full-user-request.dto';
import { BcryptPasswordEncoder } from 'src/auth/utils/bcrypt.util';

@Injectable()
export class ComplementaryDataUserService {
  constructor(
    @InjectRepository(ComplementaryDataUser)
    private readonly _complementaryDataUserRepository: Repository<ComplementaryDataUser>,
    @InjectRepository(User)
    private readonly _userRepository: Repository<User>,
    private readonly _bcryptPasswordEncoder: BcryptPasswordEncoder,
    private readonly _customUserRepository: UserRepository,
  ) {}

  async create(createComplementaryDataUserDto: CreateComplementaryDataUserDto) {
    try {
      createComplementaryDataUserDto.password =
        createComplementaryDataUserDto.is_cgiar
          ? null
          : this._bcryptPasswordEncoder.encode(
              createComplementaryDataUserDto.password.toString(),
            );
      const newComplementaryData: ComplementaryDataUser =
        await this._complementaryDataUserRepository.save(
          createComplementaryDataUserDto,
        );
      return newComplementaryData;
    } catch (error) {
      console.log(error)
      this._userRepository.delete(createComplementaryDataUserDto.user.id);
      return new HttpException(
        'Error when creating supplementary data',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  findAll() {
    return `This action returns all complementaryDataUser`;
  }

  findOne(id: number) {
    return `This action returns a #${id} complementaryDataUser`;
  }

  async findOneByEmail(email: string) {
    return 1;
  }

  update(
    id: number,
    updateComplementaryDataUserDto: UpdateComplementaryDataUserDto,
  ) {
    return `This action updates a #${id} complementaryDataUser`;
  }

  remove(id: number) {
    return `This action removes a #${id} complementaryDataUser`;
  }
}
