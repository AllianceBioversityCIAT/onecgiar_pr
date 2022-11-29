import { Test, TestingModule } from '@nestjs/testing';
import { EvidencesController } from './evidences.controller';
import { EvidencesService } from './evidences.service';

describe('EvidencesController', () => {
  let controller: EvidencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvidencesController],
      providers: [EvidencesService],
    }).compile();

    controller = module.get<EvidencesController>(EvidencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
