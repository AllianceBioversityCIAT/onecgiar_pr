import { Test, TestingModule } from '@nestjs/testing';
import { PathwayController } from './pathway.controller';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';

describe('PathwayController', () => {
  let controller: PathwayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PathwayController],
      providers: [
        {
          provide: IpsrPathwayStepFourService,
          useValue: {
            saveMain: jest.fn(),
            getStepFour: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PathwayController>(PathwayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
