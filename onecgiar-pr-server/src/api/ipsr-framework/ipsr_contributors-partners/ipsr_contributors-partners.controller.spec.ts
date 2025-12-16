import { Test, TestingModule } from '@nestjs/testing';
import { IpsrContributorsPartnersController } from './ipsr_contributors-partners.controller';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('IpsrContributorsPartnersController', () => {
  let controller: IpsrContributorsPartnersController;
  let service: jest.Mocked<IpsrContributorsPartnersService>;

  beforeEach(async () => {
    const serviceMock = {
      getContributorsPartnersByResultId: jest.fn(),
      updateContributorsAndPartners: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpsrContributorsPartnersController],
      providers: [
        {
          provide: IpsrContributorsPartnersService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get(IpsrContributorsPartnersController);
    service = module.get(
      IpsrContributorsPartnersService,
    ) as jest.Mocked<IpsrContributorsPartnersService>;
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
