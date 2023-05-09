import { Module } from '@nestjs/common';
import { ClarisaFirstOrderAdministrativeDivisionService } from './clarisa-first-order-administrative-division.service';
import { ClarisaFirstOrderAdministrativeDivisionController } from './clarisa-first-order-administrative-division.controller';
import { ClarisaFirstOrderAdministrativeDivisionRepository } from './clarisa-first-order-administrative-division.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [ClarisaFirstOrderAdministrativeDivisionController],
  imports: [HttpModule],
  providers: [ClarisaFirstOrderAdministrativeDivisionService, ClarisaFirstOrderAdministrativeDivisionRepository, HttpModule, HandlersError]
})
export class ClarisaFirstOrderAdministrativeDivisionModule { }
