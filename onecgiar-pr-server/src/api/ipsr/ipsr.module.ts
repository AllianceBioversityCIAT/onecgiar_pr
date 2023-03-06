import { Module } from '@nestjs/common';
import { IpsrService } from './ipsr.service';
import { IpsrController } from './ipsr.controller';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';
import { ResultInnovationPackageModule } from './result-innovation-package/result-innovation-package.module';

@Module({
  controllers: [IpsrController],
  providers: [IpsrService],
  imports: [ResultInnovationPackageModule]
})
export class IpsrModule {}
