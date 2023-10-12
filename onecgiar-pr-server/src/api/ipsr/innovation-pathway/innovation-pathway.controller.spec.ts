import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPathwayController } from './innovation-pathway.controller';

describe('InnovationPathwayController', () => {
  let controller: InnovationPathwayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InnovationPathwayController],
    }).compile();

    controller = module.get<InnovationPathwayController>(
      InnovationPathwayController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
