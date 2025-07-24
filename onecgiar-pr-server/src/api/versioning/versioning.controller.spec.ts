import { Test, TestingModule } from '@nestjs/testing';
import { VersioningController } from './versioning.controller';
import { VersioningService } from './versioning.service';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';
import { UpdateQaResults } from './dto/update-qa.dto';
import { ValidRoleGuard } from '../../shared/guards/valid-role.guard';

describe('VersioningController', () => {
  let controller: VersioningController;
  let service: VersioningService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VersioningController],
      providers: [
        {
          provide: VersioningService,
          useValue: {
            versionProcess: jest.fn().mockResolvedValue('ok'),
            create: jest.fn().mockResolvedValue('ok'),
            update: jest.fn().mockResolvedValue('ok'),
            getAllPhases: jest.fn().mockResolvedValue('ok'),
            annualReplicationProcessInnovationDev: jest
              .fn()
              .mockResolvedValue('ok'),
            annualReplicationProcessInnovationPackage: jest
              .fn()
              .mockResolvedValue('ok'),
            setQaStatus: jest.fn().mockResolvedValue('ok'),
            updateLinkResultQa: jest.fn().mockResolvedValue('ok'),
            getNumberRresultsReplicated: jest.fn().mockResolvedValue('ok'),
            find: jest.fn().mockResolvedValue('ok'),
            getVersionOfAResult: jest.fn().mockResolvedValue('ok'),
            delete: jest.fn().mockResolvedValue('ok'),
          },
        },
        {
          provide: ValidRoleGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    })
      .overrideGuard(ValidRoleGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<VersioningController>(VersioningController);
    service = module.get<VersioningService>(VersioningService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call versionProcess on phaseChangeProcess', async () => {
    await controller.phaseChangeProcess('5', mockUser);
    expect(service.versionProcess).toHaveBeenCalledWith(5, mockUser);
  });

  it('should call create on create', async () => {
    const dto = new CreateVersioningDto();
    await controller.create(dto, mockUser);
    expect(service.create).toHaveBeenCalledWith(mockUser, dto);
  });

  it('should call update on update', async () => {
    const dto = new UpdateVersioningDto();
    await controller.update('2', dto);
    expect(service.update).toHaveBeenCalledWith(2, dto);
  });

  it('should call getAllPhases on findAll', async () => {
    await controller.findAll();
    expect(service.getAllPhases).toHaveBeenCalled();
  });

  it('should call annualReplicationProcessInnovationDev on updateAnnuallyResult', async () => {
    await controller.updateAnnuallyResult(mockUser);
    expect(service.annualReplicationProcessInnovationDev).toHaveBeenCalledWith(
      mockUser,
    );
  });

  it('should call annualReplicationProcessInnovationPackage on updateAnnuallyIPSR', async () => {
    await controller.updateAnnuallyIPSR(mockUser);
    expect(
      service.annualReplicationProcessInnovationPackage,
    ).toHaveBeenCalledWith(mockUser);
  });

  it('should call setQaStatus on updateStatusQa', async () => {
    const dto = new UpdateQaResults();
    await controller.updateStatusQa(dto);
    expect(service.setQaStatus).toHaveBeenCalledWith(dto);
  });

  it('should call updateLinkResultQa on updateLinksQa', async () => {
    await controller.updateLinksQa();
    expect(service.updateLinkResultQa).toHaveBeenCalled();
  });

  it('should call getNumberRresultsReplicated on getNumberResults', async () => {
    await controller.getNumberResults('1', '2');
    expect(service.getNumberRresultsReplicated).toHaveBeenCalledWith(1, 2);
  });

  it('should call find on find', async () => {
    await controller.find();
    expect(service.find).toHaveBeenCalled();
  });

  it('should call getVersionOfAResult on findVersionOfAResult', async () => {
    await controller.findVersionOfAResult('7');
    expect(service.getVersionOfAResult).toHaveBeenCalledWith(7);
  });

  it('should call delete on remove', async () => {
    await controller.remove('3');
    expect(service.delete).toHaveBeenCalledWith(3);
  });
});
