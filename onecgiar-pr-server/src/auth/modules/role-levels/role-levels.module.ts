import { Module } from '@nestjs/common';
import { RoleLevelsService } from './role-levels.service';
import { RoleLevelsController } from './role-levels.controller';
import { RoleLevelRepository } from './RoleLevels.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RoleRepository } from '../role/Role.repository';

@Module({
  controllers: [RoleLevelsController],
  providers: [
    RoleLevelsService,
    RoleLevelRepository,
    HandlersError,
    RoleRepository
  ],
  exports: [
    RoleLevelRepository,
    RoleLevelsService
  ]
})
export class RoleLevelsModule {}
