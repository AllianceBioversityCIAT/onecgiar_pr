import { Module } from '@nestjs/common';
import { EvidencesService } from './evidences.service';
import { EvidencesController } from './evidences.controller';

@Module({
  controllers: [EvidencesController],
  providers: [EvidencesService]
})
export class EvidencesModule {}
