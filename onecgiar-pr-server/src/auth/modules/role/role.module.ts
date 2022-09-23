import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

@Module({
  controllers: [RoleController],
  providers: [RoleService, Repository],
  imports: [TypeOrmModule.forFeature([Role])],
  exports: [TypeOrmModule.forFeature([Role]), RoleService],
})
export class RoleModule {}
