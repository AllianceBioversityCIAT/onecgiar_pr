import { Module } from '@nestjs/common';
import { EvidenceTypesService } from './evidence_types.service';
import { EvidenceTypesController } from './evidence_types.controller';

@Module({
  controllers: [EvidenceTypesController],
  providers: [EvidenceTypesService]
})
export class EvidenceTypesModule {}
