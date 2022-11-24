import { Module } from '@nestjs/common';
import { CapdevsTermsService } from './capdevs-terms.service';
import { CapdevsTermsController } from './capdevs-terms.controller';
import { CapdevsTermRepository } from './capdevs-terms.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [CapdevsTermsController],
  providers: [CapdevsTermsService, CapdevsTermRepository, HandlersError],
  exports: [
    CapdevsTermRepository
  ]
})
export class CapdevsTermsModule {}
