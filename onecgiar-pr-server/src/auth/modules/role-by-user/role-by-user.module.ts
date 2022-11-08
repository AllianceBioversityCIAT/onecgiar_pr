import { Module } from '@nestjs/common';
import { RoleByUserService } from './role-by-user.service';
import { RoleByUserController } from './role-by-user.controller';
import { RoleByUserRepository } from './RoleByUser.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RoleLevelsModule } from '../role-levels/role-levels.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  controllers: [RoleByUserController],
  imports: [RoleLevelsModule],
  providers: [
    RoleByUserService,
    RoleByUserRepository,
    HandlersError,
    UserRepository,
  ],
  exports: [RoleByUserRepository],
})
export class RoleByUserModule {}
