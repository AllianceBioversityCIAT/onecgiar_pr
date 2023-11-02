import { Test, TestingModule } from '@nestjs/testing';
import { PrmsTablesTypesController } from './prms-tables-types.controller';
import { PrmsTablesTypesService } from './prms-tables-types.service';
import { beforeEach, describe, it, expect } from '@jest/globals';

describe('PrmsTablesTypesController', () => {
  let controller: PrmsTablesTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrmsTablesTypesController],
      providers: [PrmsTablesTypesService],
    }).compile();

    controller = module.get<PrmsTablesTypesController>(
      PrmsTablesTypesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
