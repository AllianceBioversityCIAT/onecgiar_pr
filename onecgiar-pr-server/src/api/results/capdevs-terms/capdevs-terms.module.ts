import { Module } from '@nestjs/common';
import { CapdevsTermsService } from './capdevs-terms.service';
import { CapdevsTermsController } from './capdevs-terms.controller';

@Module({
  controllers: [CapdevsTermsController],
  providers: [CapdevsTermsService]
})
export class CapdevsTermsModule {}
