import { Test, TestingModule } from '@nestjs/testing';
import { IpsrFrameworkController } from './ipsr-framework.controller';
import { IpsrFrameworkService } from './ipsr-framework.service';

describe('IpsrFrameworkController', () => {
  let controller: IpsrFrameworkController;
  let service: jest.Mocked<IpsrFrameworkService>;

  beforeEach(async () => {
    const serviceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpsrFrameworkController],
      providers: [
        {
          provide: IpsrFrameworkService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<IpsrFrameworkController>(IpsrFrameworkController);
    service = module.get(
      IpsrFrameworkService,
    ) as jest.Mocked<IpsrFrameworkService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have IpsrFrameworkService injected', () => {
    expect(service).toBeDefined();
  });
});
