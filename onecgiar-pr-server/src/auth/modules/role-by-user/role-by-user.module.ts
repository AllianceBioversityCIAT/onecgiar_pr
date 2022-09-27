import { Module } from '@nestjs/common';
import { RoleByUserService } from './role-by-user.service';
import { RoleByUserController } from './role-by-user.controller';
import { RoleByUserRepository } from './RoleByUser.repository';

@Module({
  controllers: [RoleByUserController],
  providers: [
    RoleByUserService,
    RoleByUserRepository
  ],
  exports: [
    RoleByUserRepository
  ]
})
export class RoleByUserModule {}
