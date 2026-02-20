import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { UpdateContributorsPartnersDto } from './dto/update-contributors-partners.dto';
import { IpsrContributorsPartnersService } from './ipsr_contributors-partners.service';
import { ContributorsPartnersService } from '../../results-framework-reporting/contributors-partners/contributors-partners.service';

describe('IpsrContributorsPartnersService', () => {
  let service: IpsrContributorsPartnersService;
  let contributorsPartnersService: jest.Mocked<ContributorsPartnersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IpsrContributorsPartnersService,
        {
          provide: ContributorsPartnersService,
          useValue: {
            getContributorsPartnersByResultId: jest.fn(),
            updateContributorsAndPartners: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(IpsrContributorsPartnersService);
    contributorsPartnersService = module.get(
      ContributorsPartnersService,
    ) as jest.Mocked<ContributorsPartnersService>;
  });

  describe('getContributorsPartnersByResultId', () => {
    it('should delegate to ContributorsPartnersService', async () => {
      const resultId = 8387;
      const expectedResponse = {
        response: {
          result_id: resultId,
          result_code: '6163',
          title: 'Test Innovation',
          level_id: 4,
          owner_initiative: {
            id: 50,
            official_code: 'SP01',
            initiative_name: 'Breeding for Tomorrow',
          },
        },
        message: 'Contributors and Partners fetched successfully (P25)',
        status: HttpStatus.OK,
      };

      contributorsPartnersService.getContributorsPartnersByResultId.mockResolvedValue(
        expectedResponse as any,
      );

      const response =
        await service.getContributorsPartnersByResultId(resultId);

      expect(response).toBe(expectedResponse);
      expect(
        contributorsPartnersService.getContributorsPartnersByResultId,
      ).toHaveBeenCalledWith(resultId);
    });
  });

  describe('updateContributorsAndPartners', () => {
    it('should delegate to ContributorsPartnersService', async () => {
      const resultId = 321;
      const payload: UpdateContributorsPartnersDto = {
        changePrimaryInit: 2,
        result_toc_result: {
          planned_result: true,
          initiative_id: 10,
          result_toc_results: [],
        },
        contributors_result_toc_result: [],
        institutions: [],
        contributing_center: [],
        bilateral_projects: [],
        no_applicable_partner: false,
        is_lead_by_partner: true,
      };
      const user = { id: 5 } as TokenDto;
      const expectedResponse = {
        response: {
          toc_mapping: { toc: true },
          partners: { partners: true },
        },
        message: 'Toc ok | Partners ok',
        status: HttpStatus.CREATED,
      };

      contributorsPartnersService.updateContributorsAndPartners.mockResolvedValue(
        expectedResponse as any,
      );

      const result = await service.updateContributorsAndPartners(
        resultId,
        payload,
        user,
      );

      expect(result).toBe(expectedResponse);
      expect(
        contributorsPartnersService.updateContributorsAndPartners,
      ).toHaveBeenCalledWith(resultId, payload, user);
    });
  });
});
