import { Module } from '@nestjs/common';
import { ComplementaryDataUserService } from './complementary-data-user.service';
import { ComplementaryDataUserController } from './complementary-data-user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplementaryDataUser } from './entities/complementary-data-user.entity';
import { User } from '../user/entities/user.entity';
import { UserRepository } from '../user/repositories/user.repository';
import { BcryptPasswordEncoder } from 'src/auth/utils/bcrypt.util';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [ComplementaryDataUserController],
  providers: [
    ComplementaryDataUserService,
    BcryptPasswordEncoder,
    UserRepository,
  ],
  exports: [
    ComplementaryDataUserService,
    TypeOrmModule.forFeature([ComplementaryDataUser]),
  ],
  imports: [TypeOrmModule.forFeature([ComplementaryDataUser, User])],
})
export class ComplementaryDataUserModule {}
