import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RouterModule } from '@nestjs/core';
import { ComplementaryDataUserService } from '../complementary-data-user/complementary-data-user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ComplementaryDataUser } from '../complementary-data-user/entities/complementary-data-user.entity';
import { UserRepository } from './repositories/user.repository';
import { BcryptPasswordEncoder } from 'src/auth/utils/bcrypt.util';
import { RoleService } from '../role/role.service';
import { Role } from '../role/entities/role.entity';
import { Repository } from 'typeorm';
import { RolesUserByAplicationService } from '../roles-user-by-aplication/roles-user-by-aplication.service';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    ComplementaryDataUserService,
    BcryptPasswordEncoder,
    UserRepository,
    RoleService,
    Repository,
    RolesUserByAplicationService
  ],
  imports: [
    TypeOrmModule.forFeature([User, Role, ComplementaryDataUser]),
  ],
  exports: [UserRepository],
})
export class UserModule {}
