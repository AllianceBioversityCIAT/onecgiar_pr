import { Module } from '@nestjs/common';
import { RoleByUserService } from './role-by-user.service';
import { RoleByUserController } from './role-by-user.controller';
import { RoleByUserRepository } from './RoleByUser.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RoleLevelRepository } from '../role-levels/RoleLevels.repository';
import { RoleLevelsModule } from '../role-levels/role-levels.module';

@Module({
  controllers: [RoleByUserController],
  imports: [
    RoleLevelsModule
  ],
  providers: [
    RoleByUserService,
    RoleByUserRepository,
    HandlersError
  ],
  exports: [
    RoleByUserRepository
  ]
})
export class RoleByUserModule {}
