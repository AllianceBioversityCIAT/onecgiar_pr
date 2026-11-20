import {
  Controller,
  Body,
  Patch,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { NonPooledProjectsService } from './non-pooled-projects.service';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';
import { NonPooledProject } from './entities/non-pooled-project.entity';
import { returnFormatService } from '../../../shared/extendsGlobalDTO/returnServices.dto';
import {
  LockedWhileInQa,
  QA_REVIEW_LOCK_LOOKUPS,
} from '../../../shared/guards/qa-review-lock.guard';

@Controller()
@UseInterceptors(ResponseInterceptor)
export class NonPooledProjectsController {
  constructor(
    private readonly nonPooledProjectsService: NonPooledProjectsService,
  ) {}
  @LockedWhileInQa({
    param: 'id',
    lookup: QA_REVIEW_LOCK_LOOKUPS.nonPooledProject,
  })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateNonPooledProjectDto: NonPooledProject,
  ): Promise<returnFormatService> {
    return await this.nonPooledProjectsService.update(
      +id,
      updateNonPooledProjectDto,
    );
  }
}
