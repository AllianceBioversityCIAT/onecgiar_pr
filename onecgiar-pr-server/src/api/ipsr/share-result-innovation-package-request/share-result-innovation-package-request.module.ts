import { Module } from '@nestjs/common';
import { ShareResultInnovationPackageRequestService } from './share-result-innovation-package-request.service';
import { ShareResultInnovationPackageRequestController } from './share-result-innovation-package-request.controller';

@Module({
  controllers: [ShareResultInnovationPackageRequestController],
  providers: [ShareResultInnovationPackageRequestService]
})
export class ShareResultInnovationPackageRequestModule {}
