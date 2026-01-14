import { Test, TestingModule } from '@nestjs/testing';
import { PathwayController } from './pathway.controller';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';
import { IpsrPathwayStepOneService } from './ipsr-pathway-step-one.service';

describe('PathwayController', () => {
  let controller: PathwayController;

  const mockStepOne = {
    getStepOne: jest.fn().mockResolvedValue({ status: 200 }),
  } as unknown as jest.Mocked<IpsrPathwayStepOneService>;

  const mockStepFour = {
    saveMain: jest.fn().mockResolvedValue({ status: 200 }),
    getStepFour: jest.fn().mockResolvedValue({ status: 200 }),
    saveBilaterals: jest.fn().mockResolvedValue({ status: 200 }),
  } as unknown as jest.Mocked<IpsrPathwayStepFourService>;

  const user = { id: 1 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PathwayController],
      providers: [
        {
          provide: IpsrPathwayStepOneService,
          useValue: mockStepOne,
        },
        {
          provide: IpsrPathwayStepFourService,
          useValue: mockStepFour,
        },
      ],
    }).compile();

    controller = module.get<PathwayController>(PathwayController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Step One
  it('getStepOne delegates to step one service', async () => {
    await controller.getStepOne('5');
    expect(mockStepOne.getStepOne).toHaveBeenCalledWith(5);
  });

  // Step Four
  it('getStepFour delegates', async () => {
    await controller.getStepFour('17');
    expect(mockStepFour.getStepFour).toHaveBeenCalledWith(17);
  });

  it('updateStepFour delegates with id, user, dto', async () => {
    const dto = { a: 1 } as any;
    await controller.updateStepFour('18', dto, user);
    expect(mockStepFour.saveMain).toHaveBeenCalledWith(18, user, dto);
  });

  it('saveFourBilaterals delegates', async () => {
    const bilaterals = { b: 1 } as any;
    await controller.saveFourBilaterals('20', bilaterals, user);
    expect(mockStepFour.saveBilaterals).toHaveBeenCalledWith(
      20,
      user,
      bilaterals,
    );
  });
});
