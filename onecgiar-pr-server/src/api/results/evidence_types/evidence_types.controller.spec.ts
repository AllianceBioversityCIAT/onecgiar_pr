import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceTypesController } from './evidence_types.controller';
import { EvidenceTypesService } from './evidence_types.service';

describe('EvidenceTypesController', () => {
  let controller: EvidenceTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvidenceTypesController],
      providers: [EvidenceTypesService],
    }).compile();

    controller = module.get<EvidenceTypesController>(EvidenceTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
