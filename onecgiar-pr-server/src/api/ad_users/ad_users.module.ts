import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdUserService } from './ad_users.service';
import { AdUsersController } from './ad_users.controller';
import { AdUser } from './entity/ad-user.entity';
import { AdUserRepository } from './repository/ad-users.repository';
import { ActiveDirectoryService } from '../../auth/services/active-directory.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdUser])],
  controllers: [AdUsersController],
  providers: [AdUserService, AdUserRepository, ActiveDirectoryService],
  exports: [AdUserService, AdUserRepository],
})
export class AdUsersModule {}
