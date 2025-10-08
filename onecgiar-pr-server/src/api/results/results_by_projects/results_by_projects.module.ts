import { Module } from '@nestjs/common';
import { ResultsByProjectsService } from './results_by_projects.service';
import { ResultsByProjectsController } from './results_by_projects.controller';

@Module({
  controllers: [ResultsByProjectsController],
  providers: [ResultsByProjectsService],
})
export class ResultsByProjectsModule {}
