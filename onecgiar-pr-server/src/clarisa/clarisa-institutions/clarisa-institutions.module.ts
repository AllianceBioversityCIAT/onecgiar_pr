import { Module } from '@nestjs/common';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { ClarisaInstitutionsController } from './clarisa-institutions.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaInstitutionsRoutes } from './clarisaInstitutions.routes';
import { ClarisaInstitutionsRepository } from './ClariasaInstitutions.repository';

@Module({
  controllers: [ClarisaInstitutionsController],
  providers: [ClarisaInstitutionsService, ClarisaInstitutionsRepository],
  imports: [RouterModule.register(ClarisaInstitutionsRoutes)],
  exports: [ClarisaInstitutionsRepository],
})
export class ClarisaInstitutionsModule {}
