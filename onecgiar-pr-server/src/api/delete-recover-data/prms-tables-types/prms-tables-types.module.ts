import { Module } from '@nestjs/common';
import { PrmsTablesTypesService } from './prms-tables-types.service';
import { PrmsTablesTypesController } from './prms-tables-types.controller';

@Module({
  controllers: [PrmsTablesTypesController],
  providers: [PrmsTablesTypesService]
})
export class PrmsTablesTypesModule {}
