import { Module } from '@nestjs/common';
import { IntellectualPropertyExpertRepository } from './repositories/intellectual_property_experts.repository';

@Module({
  controllers: [],
  providers: [IntellectualPropertyExpertRepository],
  exports: [IntellectualPropertyExpertRepository],
})
export class IntellectualPropertyExpertsModule {}
