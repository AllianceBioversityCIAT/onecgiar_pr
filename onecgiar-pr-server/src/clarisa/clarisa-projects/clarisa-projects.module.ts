import { Module } from '@nestjs/common';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProjectsController } from './clarisa-projects.controller';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaProjectsRepository } from './clarisa-projects.repository';

@Module({
  controllers: [ClarisaProjectsController],
  providers: [ClarisaProjectsService, HandlersError, ClarisaProjectsRepository],
  exports: [ClarisaProjectsService, ClarisaProjectsRepository],
})
export class ClarisaProjectsModule {}
