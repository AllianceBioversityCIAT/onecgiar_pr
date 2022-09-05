import { Module } from '@nestjs/common';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';
import { ClarisaInstitutionsTypeController } from './clarisa-institutions-type.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaInstitutionsTypeRoutes } from './clarisaInstitutionsType.routes';

@Module({
  controllers: [ClarisaInstitutionsTypeController],
  providers: [ClarisaInstitutionsTypeService],
  imports: [
    RouterModule.register(ClarisaInstitutionsTypeRoutes)
  ]
})
export class ClarisaInstitutionsTypeModule {}
