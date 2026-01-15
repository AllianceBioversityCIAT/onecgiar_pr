import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { IpsrGeneralInformationController } from './ipsr_general_information.controller';
import { IpsrGeneralInformationService } from './ipsr_general_information.service';
import { UpdateIpsrGeneralInformationDto } from './dto/update-ipsr_general_information.dto';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

describe('IpsrGeneralInformationController', () => {
  let controller: IpsrGeneralInformationController;
  let service: jest.Mocked<IpsrGeneralInformationService>;

  const mockUser: TokenDto = {
    id: 10,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
  };
  const mockDto: UpdateIpsrGeneralInformationDto = {
    title: 'Test Title',
    description: 'Test Description',
    gender_tag_level_id: 1,
    climate_change_tag_level_id: 1,
    nutrition_tag_level_id: 1,
    environmental_biodiversity_tag_level_id: 1,
    poverty_tag_level_id: 1,
    is_discontinued: false,
    discontinued_options: [],
  } as UpdateIpsrGeneralInformationDto;

  beforeEach(async () => {
    const mockService = {
      generalInformation: jest.fn(),
      findOneInnovation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IpsrGeneralInformationController],
      providers: [
        { provide: IpsrGeneralInformationService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<IpsrGeneralInformationController>(
      IpsrGeneralInformationController,
    );
    service = module.get(IpsrGeneralInformationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generalInformation', () => {
    it('should call service with correct parameters', async () => {
      const mockResponse = {
        response: {},
        status: HttpStatus.OK,
        message: 'Success',
      };
      service.generalInformation.mockResolvedValue(mockResponse);

      const result = await controller.generalInformation(1, mockDto, mockUser);

      expect(service.generalInformation).toHaveBeenCalledWith(
        1,
        mockDto,
        mockUser,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle service errors', async () => {
      const mockError = {
        response: {},
        message: 'Error',
        status: HttpStatus.BAD_REQUEST,
      };
      service.generalInformation.mockResolvedValue(mockError);

      const result = await controller.generalInformation(1, mockDto, mockUser);

      expect(result).toEqual(mockError);
    });
  });

  describe('findOne', () => {
    it('should call service with correct resultId', async () => {
      const mockResponse = {
        response: { id: 1 },
        status: HttpStatus.OK,
        message: 'Success',
      };
      service.findOneInnovation.mockResolvedValue(mockResponse);

      const result = await controller.findOne(1);

      expect(service.findOneInnovation).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResponse);
    });

    it('should handle not found errors', async () => {
      const mockError = {
        response: {},
        message: 'Not found',
        status: HttpStatus.NOT_FOUND,
      };
      service.findOneInnovation.mockResolvedValue(mockError);

      const result = await controller.findOne(999);

      expect(result).toEqual(mockError);
    });
  });
});
