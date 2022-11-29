import { Module } from '@nestjs/common';
import { ClarisaMeliaStudyTypeService } from './clarisa-melia-study-type.service';
import { ClarisaMeliaStudyTypeController } from './clarisa-melia-study-type.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaMeliaStudyTypeRoutes } from './clarisaMeliaStudyType.routes';
import { ClarisaMeliaStudyTypeRepository } from './ClariasaMeliasStudyType.repository';

@Module({
  controllers: [ClarisaMeliaStudyTypeController],
  providers: [ClarisaMeliaStudyTypeService, ClarisaMeliaStudyTypeRepository],
  imports: [RouterModule.register(ClarisaMeliaStudyTypeRoutes)],
  exports: [ClarisaMeliaStudyTypeRepository],
})
export class ClarisaMeliaStudyTypeModule {}
