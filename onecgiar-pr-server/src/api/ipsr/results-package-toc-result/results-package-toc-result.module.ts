import { Module } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { ResultsPackageTocResultController } from './results-package-toc-result.controller';

@Module({
  controllers: [ResultsPackageTocResultController],
  providers: [ResultsPackageTocResultService]
})
export class ResultsPackageTocResultModule {}
