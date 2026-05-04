import { Module, forwardRef } from '@nestjs/common';
import { InnovationPathwayController } from './innovation-pathway.controller';
import { VersioningModule } from '../../versioning/versioning.module';
import { AdUsersModule } from '../../ad_users';
import { ResultDeletionAuditModule } from '../../results/result-deletion-audit/result-deletion-audit.module';
import { InnovationPathwayServicesModule } from './innovation-pathway-services.module';

@Module({
  controllers: [InnovationPathwayController],
  imports: [
    forwardRef(() => VersioningModule),
    AdUsersModule,
    ResultDeletionAuditModule,
    InnovationPathwayServicesModule,
  ],
})
export class InnovationPathwayModule {}
