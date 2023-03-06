import { Module } from '@nestjs/common';
import { ResultInnovationPackageService } from './result-innovation-package.service';
import { ResultInnovationPackageController } from './result-innovation-package.controller';

@Module({
  controllers: [ResultInnovationPackageController],
  providers: [ResultInnovationPackageService]
})
export class ResultInnovationPackageModule {}
