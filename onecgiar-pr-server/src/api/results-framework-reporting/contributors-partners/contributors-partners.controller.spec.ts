import { Test, TestingModule } from '@nestjs/testing';
import { ContributorsPartnersController } from './contributors-partners.controller';
import { ContributorsPartnersService } from './contributors-partners.service';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('ContributorsPartnersController', () => {
  let controller: ContributorsPartnersController;
  let service: jest.Mocked<ContributorsPartnersService>;

  beforeEach(async () => {
    const serviceMock = {
      getContributorsPartnersByResultId: jest.fn(),
      updateContributorsAndPartners: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributorsPartnersController],
      providers: [
        {
          provide: ContributorsPartnersService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get(ContributorsPartnersController);
    service = module.get(
      ContributorsPartnersService,
    ) as jest.Mocked<ContributorsPartnersService>;
  });

  it('should delegate fetching contributors and partners to the service', async () => {
    const expected = { response: { result_id: 1 } };
    service.getContributorsPartnersByResultId.mockResolvedValue(
      expected as any,
    );

    const result = await controller.getContributorsPartners(1);

    expect(service.getContributorsPartnersByResultId).toHaveBeenCalledWith(1);
    expect(result).toBe(expected);
  });

  it('should delegate updates to the service with params, payload, and user', async () => {
    const payload = {
      toc_mapping: { result_id: 1 },
    } as UpdateContributorsPartnersDto;
    const user = { id: 10 } as TokenDto;
    const expected = { status: 200 };
    service.updateContributorsAndPartners.mockResolvedValue(expected as any);

    const result = await controller.updateContributorsPartners(
      5,
      payload,
      user,
    );

    expect(service.updateContributorsAndPartners).toHaveBeenCalledWith(
      5,
      payload,
      user,
    );
    expect(result).toBe(expected);
  });
});
