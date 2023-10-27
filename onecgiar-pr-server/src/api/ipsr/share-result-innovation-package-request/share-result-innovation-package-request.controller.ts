import { Controller } from '@nestjs/common';
import { ShareResultInnovationPackageRequestService } from './share-result-innovation-package-request.service';

@Controller('share-result-innovation-package-request')
export class ShareResultInnovationPackageRequestController {
  constructor(
    private readonly shareResultInnovationPackageRequestService: ShareResultInnovationPackageRequestService,
  ) {}
}
