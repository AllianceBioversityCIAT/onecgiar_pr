import { Module } from '@nestjs/common';
import { SharePointService } from './share-point.service';
import { GlobalParameterCacheModule } from '../cache/global-parameter-cache.module';
import { HttpModule } from '@nestjs/axios';
import { EvidenceSharepointRepository } from '../../../api/results/evidences/repositories/evidence-sharepoint.repository';
import { HandlersError } from '../../handlers/error.utils';
import { EvidencesRepository } from '../../../api/results/evidences/evidences.repository';

@Module({
  providers: [
    SharePointService,
    EvidenceSharepointRepository,
    HandlersError,
    EvidencesRepository,
  ],
  exports: [
    SharePointService,
    GlobalParameterCacheModule,
    EvidenceSharepointRepository,
  ],
  imports: [GlobalParameterCacheModule, HttpModule],
})
export class SharePointModule {}
