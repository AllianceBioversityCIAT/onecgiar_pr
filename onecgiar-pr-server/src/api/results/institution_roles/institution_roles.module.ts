import { Module } from '@nestjs/common';
import { InstitutionRolesService } from './institution_roles.service';
import { InstitutionRolesController } from './institution_roles.controller';

@Module({
  controllers: [InstitutionRolesController],
  providers: [InstitutionRolesService]
})
export class InstitutionRolesModule {}
