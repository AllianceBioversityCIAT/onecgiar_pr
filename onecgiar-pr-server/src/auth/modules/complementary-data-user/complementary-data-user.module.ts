import { Module } from '@nestjs/common';
import { ComplementaryDataUserService } from './complementary-data-user.service';
import { ComplementaryDataUserController } from './complementary-data-user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplementaryDataUser } from './entities/complementary-data-user.entity';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repositories/user.repository';
import { BcryptPasswordEncoder } from 'src/auth/utils/bcrypt.util';

@Module({
  controllers: [ComplementaryDataUserController],
  providers: [
    ComplementaryDataUserService,
    BcryptPasswordEncoder,
    UserRepository,
  ],
  exports: [ComplementaryDataUserService],
  imports: [TypeOrmModule.forFeature([User, ComplementaryDataUser])],
})
export class ComplementaryDataUserModule {}
