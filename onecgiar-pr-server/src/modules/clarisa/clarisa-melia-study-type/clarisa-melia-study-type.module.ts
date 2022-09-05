import { Module } from '@nestjs/common';
import { ClarisaMeliaStudyTypeService } from './clarisa-melia-study-type.service';
import { ClarisaMeliaStudyTypeController } from './clarisa-melia-study-type.controller';

@Module({
  controllers: [ClarisaMeliaStudyTypeController],
  providers: [ClarisaMeliaStudyTypeService]
})
export class ClarisaMeliaStudyTypeModule {}
