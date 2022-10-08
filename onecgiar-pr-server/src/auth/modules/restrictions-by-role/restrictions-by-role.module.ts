import { Module } from '@nestjs/common';
import { RestrictionsByRoleService } from './restrictions-by-role.service';
import { RestrictionsByRoleController } from './restrictions-by-role.controller';

@Module({
  controllers: [RestrictionsByRoleController],
  providers: [RestrictionsByRoleService]
})
export class RestrictionsByRoleModule {}
