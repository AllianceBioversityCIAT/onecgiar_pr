import { Module } from '@nestjs/common';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { ClarisaInstitutionsController } from './clarisa-institutions.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaInstitutionsRoutes } from './clarisaInstitutions.routes';

@Module({
  controllers: [ClarisaInstitutionsController],
  providers: [ClarisaInstitutionsService],
  imports: [RouterModule.register(ClarisaInstitutionsRoutes)],
})
export class ClarisaInstitutionsModule {}
