import { Module } from '@nestjs/common';
import { OstMeliaStudiesService } from './ost-melia-studies.service';
import { OstMeliaStudiesController } from './ost-melia-studies.controller';
import { OstMeliaStudiesRepository } from './ost-melia-studies.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';

@Module({
  controllers: [OstMeliaStudiesController],
  providers: [
    OstMeliaStudiesService,
    OstMeliaStudiesRepository,
    ClarisaInitiativesRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [OstMeliaStudiesRepository],
})
export class OstMeliaStudiesModule {}
