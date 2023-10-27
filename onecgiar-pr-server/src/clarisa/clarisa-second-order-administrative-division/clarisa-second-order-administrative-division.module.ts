import { Module } from '@nestjs/common';
import { ClarisaSecondOrderAdministrativeDivisionService } from './clarisa-second-order-administrative-division.service';
import { ClarisaSecondOrderAdministrativeDivisionController } from './clarisa-second-order-administrative-division.controller';
import { HttpModule } from '@nestjs/axios';
import { ClarisaSecondOrderAdministrativeDivisionRepository } from './clarisa-second-order-administrative-division.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaSecondOrderAdministrativeDivisionController],
  imports: [HttpModule],
  providers: [
    ClarisaSecondOrderAdministrativeDivisionService,
    ClarisaSecondOrderAdministrativeDivisionRepository,
    HttpModule,
    HandlersError,
  ],
})
export class ClarisaSecondOrderAdministrativeDivisionModule {}
