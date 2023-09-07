import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { HandlersError } from '../shared/handlers/error.utils';
import { ElasticController } from './elastic.controller';
import { ElasticService } from './elastic.service';
import { ResultRepository } from '../api/results/result.repository';
import { ValidRoleGuard } from '../shared/guards/valid-role.guard';
import { RoleByUserRepository } from '../auth/modules/role-by-user/RoleByUser.repository';

@Module({
  imports: [HttpModule],
  providers: [
    ElasticService,
    HandlersError,
    ResultRepository,
    ValidRoleGuard,
    RoleByUserRepository,
  ],
  exports: [HttpModule, ElasticService],
  controllers: [ElasticController],
})
export class ElasticModule {}
