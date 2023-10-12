import { Test, TestingModule } from '@nestjs/testing';
import { OstMeliaStudiesController } from './ost-melia-studies.controller';
import { OstMeliaStudiesService } from './ost-melia-studies.service';

describe('OstMeliaStudiesController', () => {
  let controller: OstMeliaStudiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OstMeliaStudiesController],
      providers: [OstMeliaStudiesService],
    }).compile();

    controller = module.get<OstMeliaStudiesController>(
      OstMeliaStudiesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
