import { Module } from '@nestjs/common';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';
import { ClarisaInstitutionsTypeController } from './clarisa-institutions-type.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaInstitutionsTypeRoutes } from './clarisaInstitutionsType.routes';
import { ClarisaInstitutionsTypeRepository } from './ClariasaInstitutionsType.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaInstitutionsTypeController],
  providers: [ClarisaInstitutionsTypeService, ClarisaInstitutionsTypeRepository, HandlersError],
  imports: [RouterModule.register(ClarisaInstitutionsTypeRoutes)],
  exports: [
    ClarisaInstitutionsTypeRepository
  ]
})
export class ClarisaInstitutionsTypeModule {}
