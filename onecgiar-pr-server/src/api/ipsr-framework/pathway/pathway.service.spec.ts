import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { PathwayService } from './pathway.service';
import { IpsrPathwayStepOneService } from './ipsr-pathway-step-one.service';
import { IpsrPathwayStepFourService } from './ipsr-pathway-step-four.service';
import { InnovationPathwayStepTwoService } from '../../ipsr/innovation-pathway/innovation-pathway-step-two.service';
import { InnovationPathwayStepThreeService } from '../../ipsr/innovation-pathway/innovation-pathway-step-three.service';

describe('PathwayService', () => {
  let service: PathwayService;
  const stepOne = { getStepOne: jest.fn() };
  const stepTwo = { getStepTwoOne: jest.fn() };
  const stepThree = { getStepThree: jest.fn() };
  const stepFour = { getStepFour: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathwayService,
        { provide: IpsrPathwayStepOneService, useValue: stepOne },
        { provide: InnovationPathwayStepTwoService, useValue: stepTwo },
        { provide: InnovationPathwayStepThreeService, useValue: stepThree },
        { provide: IpsrPathwayStepFourService, useValue: stepFour },
      ],
    }).compile();

    service = module.get<PathwayService>(PathwayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getPathwayMetadataForBilateral unwraps OK steps and nulls non-OK', async () => {
    stepOne.getStepOne.mockResolvedValue({
      status: HttpStatus.OK,
      response: { a: 1 },
    });
    stepTwo.getStepTwoOne.mockResolvedValue({
      status: HttpStatus.NOT_FOUND,
      response: null,
    });
    stepThree.getStepThree.mockResolvedValue({
      statusCode: HttpStatus.OK,
      response: { c: 3 },
    });
    stepFour.getStepFour.mockResolvedValue({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    });

    const out = await service.getPathwayMetadataForBilateral(42);

    expect(stepOne.getStepOne).toHaveBeenCalledWith(42);
    expect(stepTwo.getStepTwoOne).toHaveBeenCalledWith(42);
    expect(stepThree.getStepThree).toHaveBeenCalledWith(42);
    expect(stepFour.getStepFour).toHaveBeenCalledWith(42);
    expect(out).toEqual({
      step_one: { a: 1 },
      step_two: null,
      step_three: { c: 3 },
      step_four: null,
    });
  });
});
