import { Test, TestingModule } from '@nestjs/testing';
import { ShareResultRequestController } from './share-result-request.controller';
import { ShareResultRequestService } from './share-result-request.service';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';

// @akili-spec notifications/inbox-paginated-load (PAGE-T-2)
// `findReceived`/`findSent` forward the 3 optional query params (`version_id`, `scope`,
// `cursor`) to the service unchanged, as a single options object — validation itself (400 on a
// bad `version_id`/`cursor`) lives in the service (`share-result-request.service.spec.ts`,
// describe('PAGE-T-2 ...')), since the service's existing try/catch + HandlersError path is what
// turns a thrown `BadRequestException` into an HTTP 400 (see `ResponseInterceptor`). This spec
// only proves the controller is a thin, correct pass-through.
describe('ShareResultRequestController', () => {
  let controller: ShareResultRequestController;

  const mockShareResultRequestService = {
    getReceivedResultRequest: jest.fn(),
    getSentResultRequest: jest.fn(),
    resultRequest: jest.fn(),
    getResultRequestByUser: jest.fn(),
    updateResultRequestByUser: jest.fn(),
    updateResultRequestByUserV2: jest.fn(),
  };

  const user = { id: 10 } as TokenDto;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShareResultRequestController],
      providers: [
        {
          provide: ShareResultRequestService,
          useValue: mockShareResultRequestService,
        },
      ],
    }).compile();

    controller = module.get<ShareResultRequestController>(
      ShareResultRequestController,
    );
  });

  describe('findReceived', () => {
    it('forwards version_id, scope and cursor to the service as one options object', async () => {
      mockShareResultRequestService.getReceivedResultRequest.mockResolvedValue({
        response: {},
        message: 'Successful response',
        status: 200,
      });

      await controller.findReceived(user, '5', 'history', 'abc123');

      expect(
        mockShareResultRequestService.getReceivedResultRequest,
      ).toHaveBeenCalledWith(user, {
        versionId: '5',
        scope: 'history',
        cursor: 'abc123',
      });
    });

    it('forwards undefined params when none are sent (legacy call)', async () => {
      mockShareResultRequestService.getReceivedResultRequest.mockResolvedValue({
        response: {},
        message: 'Successful response',
        status: 200,
      });

      await controller.findReceived(user);

      expect(
        mockShareResultRequestService.getReceivedResultRequest,
      ).toHaveBeenCalledWith(user, {
        versionId: undefined,
        scope: undefined,
        cursor: undefined,
      });
    });
  });

  describe('findSent', () => {
    it('forwards version_id, scope and cursor to the service as one options object', async () => {
      mockShareResultRequestService.getSentResultRequest.mockResolvedValue({
        response: {},
        message: 'Successful response',
        status: 200,
      });

      await controller.findSent(user, '12', 'pending', undefined);

      expect(
        mockShareResultRequestService.getSentResultRequest,
      ).toHaveBeenCalledWith(user, {
        versionId: '12',
        scope: 'pending',
        cursor: undefined,
      });
    });
  });
});
