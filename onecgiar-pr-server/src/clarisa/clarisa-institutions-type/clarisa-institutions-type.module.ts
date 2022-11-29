import { Module } from '@nestjs/common';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';
import { ClarisaInstitutionsTypeController } from './clarisa-institutions-type.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaInstitutionsTypeRoutes } from './clarisaInstitutionsType.routes';
import { ClarisaInstitutionsTypeRepository } from './ClariasaInstitutionsType.repository';

@Module({
  controllers: [ClarisaInstitutionsTypeController],
  providers: [ClarisaInstitutionsTypeService, ClarisaInstitutionsTypeRepository],
  imports: [RouterModule.register(ClarisaInstitutionsTypeRoutes)],
  exports: [
    ClarisaInstitutionsTypeRepository
  ]
})
export class ClarisaInstitutionsTypeModule {}
