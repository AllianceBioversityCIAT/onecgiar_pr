import { Module } from '@nestjs/common';
import { InitiativeRolesService } from './initiative_roles.service';
import { InitiativeRolesController } from './initiative_roles.controller';

@Module({
  controllers: [InitiativeRolesController],
  providers: [InitiativeRolesService]
})
export class InitiativeRolesModule {}
