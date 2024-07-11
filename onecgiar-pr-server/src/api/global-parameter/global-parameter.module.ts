import { Module } from '@nestjs/common';
import { GlobalParameterService } from './global-parameter.service';
import { GlobalParameterController } from './global-parameter.controller';
import { GlobalParameterRepository } from './repositories/global-parameter.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { RoleByUserModule } from '../../auth/modules/role-by-user/role-by-user.module';

@Module({
  imports: [RoleByUserModule],
  controllers: [GlobalParameterController],
  providers: [
    GlobalParameterService,
    GlobalParameterRepository,
    HandlersError,
    ReturnResponse,
    RoleByUserRepository,
  ],
  exports: [GlobalParameterService],
})
export class GlobalParameterModule {}
