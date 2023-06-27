import { Module } from '@nestjs/common';
import { ShareResultInnovationPackageRequestService } from './share-result-innovation-package-request.service';
import { ShareResultInnovationPackageRequestController } from './share-result-innovation-package-request.controller';
import { ReturnResponse } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ShareResultInnovationPackageRequestController],
  providers: [ShareResultInnovationPackageRequestService, ReturnResponse],
})
export class ShareResultInnovationPackageRequestModule {}
