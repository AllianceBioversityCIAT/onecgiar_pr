import { Module } from '@nestjs/common';
import { ClarisaMeliaStudyTypeService } from './clarisa-melia-study-type.service';
import { ClarisaMeliaStudyTypeController } from './clarisa-melia-study-type.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaMeliaStudyTypeRoutes } from './clarisaMeliaStudyType.routes';

@Module({
  controllers: [ClarisaMeliaStudyTypeController],
  providers: [ClarisaMeliaStudyTypeService],
  imports: [
    RouterModule.register(ClarisaMeliaStudyTypeRoutes)
  ]
})
export class ClarisaMeliaStudyTypeModule {}
