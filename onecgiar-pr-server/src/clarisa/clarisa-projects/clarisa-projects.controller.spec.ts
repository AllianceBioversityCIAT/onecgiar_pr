import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaProjectsController } from './clarisa-projects.controller';
import { ClarisaProjectsService } from './clarisa-projects.service';

describe('ClarisaProjectsController', () => {
  let controller: ClarisaProjectsController;
  let service: ClarisaProjectsService;

  const mockClarisaProjectsService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaProjectsController],
      providers: [
        {
          provide: ClarisaProjectsService,
          useValue: mockClarisaProjectsService,
        },
      ],
    }).compile();

    controller = module.get<ClarisaProjectsController>(
      ClarisaProjectsController,
    );
    service = module.get<ClarisaProjectsService>(ClarisaProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all projects', async () => {
      const result = {
        response: [],
        message: 'Successful response',
        status: 200,
      };
      mockClarisaProjectsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });
});
