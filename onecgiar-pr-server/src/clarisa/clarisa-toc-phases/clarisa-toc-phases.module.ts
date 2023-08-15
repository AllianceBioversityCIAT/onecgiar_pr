import { Module } from '@nestjs/common';
import { ClarisaTocPhasesService } from './clarisa-toc-phases.service';
import { ClarisaTocPhasesController } from './clarisa-toc-phases.controller';
import { ClarisaTocPhaseRepository } from './clarisa-toc-phases.repository';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ReturnResponse } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaTocPhasesController],
  providers: [
    ClarisaTocPhasesService,
    ClarisaTocPhaseRepository,
    ResponseInterceptor,
    ReturnResponse,
  ],
  exports: [ClarisaTocPhaseRepository],
})
export class ClarisaTocPhasesModule {}
