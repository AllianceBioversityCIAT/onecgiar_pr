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
import { RolesUserByAplication } from '../roles-user-by-aplication/entities/roles-user-by-aplication.entity';
import { RoleModule } from '../role/role.module';
import { RolesUserByAplicationModule } from '../roles-user-by-aplication/roles-user-by-aplication.module';
import { ComplementaryDataUserModule } from '../complementary-data-user/complementary-data-user.module';

@Module({
  controllers: [UserController],
  providers: [UserService, BcryptPasswordEncoder, Repository, UserRepository],
  imports: [
    UserModule,
    RoleModule,
    RolesUserByAplicationModule,
    ComplementaryDataUserModule,
    TypeOrmModule.forFeature([User]),
  ],
  exports: [UserRepository, UserService, TypeOrmModule.forFeature([User])],
})
export class UserModule {}
