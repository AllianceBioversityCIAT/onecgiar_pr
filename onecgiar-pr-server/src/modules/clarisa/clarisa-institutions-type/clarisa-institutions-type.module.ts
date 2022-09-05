import { Module } from '@nestjs/common';
import { ClarisaInstitutionsTypeService } from './clarisa-institutions-type.service';
import { ClarisaInstitutionsTypeController } from './clarisa-institutions-type.controller';

@Module({
  controllers: [ClarisaInstitutionsTypeController],
  providers: [ClarisaInstitutionsTypeService]
})
export class ClarisaInstitutionsTypeModule {}
