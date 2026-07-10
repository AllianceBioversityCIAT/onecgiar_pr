import { Test, TestingModule } from '@nestjs/testing';
import { BilateralCenterController } from './bilateral-center.controller';
import { BilateralProjectsService } from './services/bilateral-projects.service';

describe('BilateralCenterController', () => {
  let controller: BilateralCenterController;
  let service: BilateralProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BilateralCenterController],
      providers: [
        {
          provide: BilateralProjectsService,
          useValue: {
            getProjectsByCenter: jest.fn().mockResolvedValue({ projects: [] }),
          },
        },
      ],
    }).compile();

    controller = module.get<BilateralCenterController>(
      BilateralCenterController,
    );
    service = module.get<BilateralProjectsService>(BilateralProjectsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return projects for a numeric centerId', async () => {
    const mockProjects = {
      projects: [
        {
          id: 1,
          shortName: 'P001',
          fullName: 'Project One',
          summary: 'summary',
          description: 'desc',
          leadCenter: { id: 10, name: 'CIMMYT', acronym: 'CIMMYT' },
          sciencePrograms: [
            {
              programId: 100,
              programCode: 'P11',
              allocation: '45.00',
              spName: 'Climate Action',
              spShortName: 'CA',
            },
          ],
        },
      ],
    };
    jest.spyOn(service, 'getProjectsByCenter').mockResolvedValue(mockProjects);

    const result = await controller.getProjects(10);
    expect(service.getProjectsByCenter).toHaveBeenCalledWith(10);
    expect(result).toEqual(mockProjects);
  });

  it('should accept a string centerId', async () => {
    await controller.getProjects('CENTER-02' as any);
    expect(service.getProjectsByCenter).toHaveBeenCalledWith('CENTER-02');
  });
});
