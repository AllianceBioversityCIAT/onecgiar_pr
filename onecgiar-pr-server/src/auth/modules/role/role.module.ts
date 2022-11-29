import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RoleRepository } from './Role.repository';

@Module({
  controllers: [RoleController],
  providers: [RoleService, Repository, HandlersError, RoleRepository],
  imports: [TypeOrmModule.forFeature([Role])],
  exports: [TypeOrmModule.forFeature([Role]), RoleService, RoleRepository],
})
export class RoleModule {}
