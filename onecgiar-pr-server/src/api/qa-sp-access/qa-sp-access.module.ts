import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { QaSpAccessController } from './qa-sp-access.controller';
import { QaSpAccessService } from './qa-sp-access.service';

/** P2-3911 — link from Reporting to the Science Program view of the new QA platform. */
@Module({
  imports: [HttpModule],
  controllers: [QaSpAccessController],
  providers: [QaSpAccessService, RoleByUserRepository, HandlersError],
})
export class QaSpAccessModule {}
