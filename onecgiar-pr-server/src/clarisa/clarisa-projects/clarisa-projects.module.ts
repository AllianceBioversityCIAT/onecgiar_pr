import { Module } from '@nestjs/common';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProjectsController } from './clarisa-projects.controller';

@Module({
  controllers: [ClarisaProjectsController],
  providers: [ClarisaProjectsService],
})
export class ClarisaProjectsModule {}
