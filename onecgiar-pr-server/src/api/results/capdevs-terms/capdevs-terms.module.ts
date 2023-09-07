import { Module } from '@nestjs/common';
import { CapdevsTermsService } from './capdevs-terms.service';
import { CapdevsTermsController } from './capdevs-terms.controller';
import { CapdevsTermRepository } from './capdevs-terms.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';

@Module({
  controllers: [CapdevsTermsController],
  providers: [
    CapdevsTermsService,
    CapdevsTermRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [CapdevsTermRepository],
})
export class CapdevsTermsModule {}
