import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultDeletionAudit } from './entities/result-deletion-audit.entity';
import { ResultDeletionAuditService } from './result-deletion-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([ResultDeletionAudit])],
  providers: [ResultDeletionAuditService],
  exports: [ResultDeletionAuditService],
})
export class ResultDeletionAuditModule {}
