import { Test, TestingModule } from '@nestjs/testing';
import { InnovationPathwayController } from './innovation-pathway.controller';
import { InnovationPathwayStepOneService } from './innovation-pathway-step-one.service';
import { InnovationPathwayStepTwoService } from './innovation-pathway-step-two.service';
import { InnovationPathwayStepThreeService } from './innovation-pathway-step-three.service';
import { InnovationPathwayStepFourService } from './innovation-pathway-step-four.service';

describe('InnovationPathwayController', () => {
  let controller: InnovationPathwayController;

  const mockStepOne = {
    getStepOne: jest.fn().mockResolvedValue({ status: 200 }),
    updateMain: jest.fn().mockResolvedValue({ status: 200 }),
    retrieveAaOutcomes: jest.fn().mockResolvedValue({ status: 200 }),
  } as unknown as jest.Mocked<InnovationPathwayStepOneService>;

  const mockStepTwo = {
    saveSetepTowOne: jest.fn().mockResolvedValue({ status: 200 }),
    saveComplementaryInnovation: jest.fn().mockResolvedValue({ status: 200 }),
    getComplementaryInnovationById: jest
      .fn()
      .mockResolvedValue({ status: 200 }),
    updateComplementaryInnovation: jest.fn().mockResolvedValue({ status: 200 }),
    inactiveComplementaryInnovation: jest
      .fn()
      .mockResolvedValue({ status: 200 }),
    getStepTwoOne: jest.fn().mockResolvedValue({ status: 200 }),
    findInnovationsAndComplementary: jest
      .fn()
      .mockResolvedValue({ status: 200 }),
    findComplementaryInnovationFuctions: jest
      .fn()
      .mockResolvedValue({ status: 200 }),
  } as unknown as jest.Mocked<InnovationPathwayStepTwoService>;

  const mockStepThree = {
    saveComplementaryinnovation: jest
      .fn()
      .mockResolvedValue({ statusCode: 200 }),
    getStepThree: jest.fn().mockResolvedValue({ status: 200 }),
  } as unknown as jest.Mocked<InnovationPathwayStepThreeService>;

  const mockStepFour = {
    getStepFour: jest.fn().mockResolvedValue({ status: 200 }),
    saveMain: jest.fn().mockResolvedValue({ status: 200 }),
    savePartners: jest.fn().mockResolvedValue({ status: 200 }),
    saveBilaterals: jest.fn().mockResolvedValue({ status: 200 }),
  } as unknown as jest.Mocked<InnovationPathwayStepFourService>;

  const user = { id: 1 } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InnovationPathwayController],
      providers: [
        { provide: InnovationPathwayStepOneService, useValue: mockStepOne },
        { provide: InnovationPathwayStepTwoService, useValue: mockStepTwo },
        { provide: InnovationPathwayStepThreeService, useValue: mockStepThree },
        { provide: InnovationPathwayStepFourService, useValue: mockStepFour },
      ],
    }).compile();

    controller = module.get(InnovationPathwayController);
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

  it('updateStepOne delegates with parsed id, dto and user', async () => {
    const dto = { any: true } as any;
    await controller.updateStepOne('6', dto, user);
    expect(mockStepOne.updateMain).toHaveBeenCalledWith(6, dto, user);
  });

  it('updateStepOneInstitutions delegates to retrieveAaOutcomes', async () => {
    await controller.updateStepOneInstitutions('7', user);
    expect(mockStepOne.retrieveAaOutcomes).toHaveBeenCalledWith(7, user);
  });

  // Step Two
  it('updateSteptwo delegates SaveStepTwoOne.complementaryInovatins', async () => {
    const body = { complementaryInovatins: [{ id: 1 }] } as any;
    await controller.updateSteptwo('8', body, user);
    expect(mockStepTwo.saveSetepTowOne).toHaveBeenCalledWith(
      8,
      user,
      body.complementaryInovatins,
    );
  });

  it('saveComplementaryInnovation delegates to step two', async () => {
    const dto = { title: 't' } as any;
    await controller.saveComplementaryInnovation('9', dto, user);
    expect(mockStepTwo.saveComplementaryInnovation).toHaveBeenCalledWith(
      9,
      user,
      dto,
    );
  });

  it('getComplementaryInnovationById delegates', async () => {
    await controller.getComplementaryInnovationById(11 as any);
    expect(mockStepTwo.getComplementaryInnovationById).toHaveBeenCalledWith(11);
  });

  it('updateComplementaryInnovation delegates with id, dto and user', async () => {
    const dto = { short_title: 's' } as any;
    await controller.updateComplementaryInnovation(12 as any, dto, user);
    expect(mockStepTwo.updateComplementaryInnovation).toHaveBeenCalledWith(
      12,
      user,
      dto,
    );
  });

  it('inactiveComplementaryInnovation delegates with id and user', async () => {
    await controller.inactiveComplementaryInnovation(13 as any, user);
    expect(mockStepTwo.inactiveComplementaryInnovation).toHaveBeenCalledWith(
      13,
      user,
    );
  });

  it('getSteptwo delegates to step two getStepTwoOne', async () => {
    await controller.getSteptwo('14');
    expect(mockStepTwo.getStepTwoOne).toHaveBeenCalledWith(14);
  });

  it('getComplementaryInnovation delegates', async () => {
    await controller.getComplementaryInnovation();
    expect(mockStepTwo.findInnovationsAndComplementary).toHaveBeenCalled();
  });

  it('getComplementaryInnovationFunctions delegates', async () => {
    await controller.getComplementaryInnovationFunctions();
    expect(mockStepTwo.findComplementaryInnovationFuctions).toHaveBeenCalled();
  });

  // Step Three
  it('updateStepthree delegates with id, body and user', async () => {
    const body = { foo: 'bar' } as any;
    await controller.updateStepthree('15', body, user);
    expect(mockStepThree.saveComplementaryinnovation).toHaveBeenCalledWith(
      15,
      user,
      body,
    );
  });

  it('getStepthree delegates', async () => {
    await controller.getStepthree('16');
    expect(mockStepThree.getStepThree).toHaveBeenCalledWith(16);
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

  it('saveFourPartners delegates', async () => {
    const partners = { p: 1 } as any;
    await controller.saveFourPartners('19', partners, user);
    expect(mockStepFour.savePartners).toHaveBeenCalledWith(19, user, partners);
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
