import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClarisaProjectsService } from './clarisa-projects.service';
import { ClarisaProjectsController } from './clarisa-projects.controller';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaProjectsRepository } from './clarisa-projects.repository';
import { ClarisaCenter } from '../clarisa-centers/entities/clarisa-center.entity';

// @akili-spec notifications/bilateral-contributor-tagging
// BCT-T-2: TypeOrmModule.forFeature([ClarisaCenter]) provides a plain Repository, not
// ClarisaCentersModule — no cycle, per BCT-T-2's disqualifier check.
@Module({
  imports: [TypeOrmModule.forFeature([ClarisaCenter])],
  controllers: [ClarisaProjectsController],
  providers: [ClarisaProjectsService, HandlersError, ClarisaProjectsRepository],
  exports: [ClarisaProjectsService, ClarisaProjectsRepository],
})
export class ClarisaProjectsModule {}
