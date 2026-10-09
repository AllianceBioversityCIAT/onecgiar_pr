import { Test, TestingModule } from '@nestjs/testing';
import { ShareResultRequestController } from './share-result-request.controller';
import { ShareResultRequestService } from './share-result-request.service';
import {
  BadRequestException,
  ParseIntPipe,
  RequestMethod,
} from '@nestjs/common';
import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
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
    // @akili-spec notifications/detail-side-panel (DSP-T-1)
    getApprovalChain: jest.fn(),
    // `BRS-T-2`
    markSeen: jest.fn(),
    markAllSeen: jest.fn(),
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

    // @akili-spec notifications/admin-pending-paging (PPG-T-2) — PPG-R-4 (received variant)
    describe('limit / seen (paged pending mode)', () => {
      beforeEach(() => {
        mockShareResultRequestService.getReceivedResultRequest.mockResolvedValue(
          {
            response: {},
            status: 200,
          },
        );
      });

      it('parses limit to a number and seen to a boolean before forwarding', async () => {
        await controller.findReceived(
          user,
          '8',
          'pending',
          'abc',
          '50',
          'false',
        );

        expect(
          mockShareResultRequestService.getReceivedResultRequest,
        ).toHaveBeenCalledWith(user, {
          versionId: '8',
          scope: 'pending',
          cursor: 'abc',
          limit: 50,
          seen: false,
        });
        const sent =
          mockShareResultRequestService.getReceivedResultRequest.mock
            .calls[0][1];
        expect(sent.limit).toBe(50);
        expect(sent.seen).toBe(false);
      });

      it('forwards seen=true and omits limit/seen keys on a legacy call', async () => {
        await controller.findReceived(
          user,
          undefined,
          'pending',
          undefined,
          '10',
          'true',
        );
        expect(
          mockShareResultRequestService.getReceivedResultRequest.mock
            .calls[0][1].seen,
        ).toBe(true);

        mockShareResultRequestService.getReceivedResultRequest.mockClear();
        await controller.findReceived(user);
        const legacy =
          mockShareResultRequestService.getReceivedResultRequest.mock
            .calls[0][1];
        expect(legacy).not.toHaveProperty('limit');
        expect(legacy).not.toHaveProperty('seen');
      });

      it.each(['0', '201', 'abc', '', '1.5', '-3'])(
        'rejects limit=%p with 400 and never calls the service',
        (limit) => {
          expect(() =>
            controller.findReceived(
              user,
              undefined,
              'pending',
              undefined,
              limit,
            ),
          ).toThrow(BadRequestException);
          expect(
            mockShareResultRequestService.getReceivedResultRequest,
          ).not.toHaveBeenCalled();
        },
      );

      it('accepts the 1 and 200 limits', async () => {
        await controller.findReceived(
          user,
          undefined,
          'pending',
          undefined,
          '1',
        );
        await controller.findReceived(
          user,
          undefined,
          'pending',
          undefined,
          '200',
        );
        expect(
          mockShareResultRequestService.getReceivedResultRequest,
        ).toHaveBeenCalledTimes(2);
      });

      it.each(['maybe', 'TRUE', '1', ''])(
        'rejects seen=%p with 400 and never calls the service',
        (seen) => {
          expect(() =>
            controller.findReceived(
              user,
              undefined,
              'pending',
              undefined,
              '10',
              seen,
            ),
          ).toThrow(BadRequestException);
          expect(
            mockShareResultRequestService.getReceivedResultRequest,
          ).not.toHaveBeenCalled();
        },
      );
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

  // @akili-spec notifications/detail-side-panel (DSP-T-1)
  describe('getApprovalChain', () => {
    it('forwards resultId (as received) and the user to the service', async () => {
      mockShareResultRequestService.getApprovalChain.mockResolvedValue({
        response: { result_id: 9400, submission: {}, steps: [] },
        message: 'Successful response',
        status: 200,
      });

      await controller.getApprovalChain('9400', user);

      expect(
        mockShareResultRequestService.getApprovalChain,
      ).toHaveBeenCalledWith('9400', user);
    });
  });

  // `BRS-T-2` (notifications/bell-read-state)
  describe('bell read state routes', () => {
    it('markSeen forwards the token user and the numeric id', async () => {
      mockShareResultRequestService.markSeen.mockResolvedValue({ status: 200 });

      await controller.markSeen(user, 5);

      expect(mockShareResultRequestService.markSeen).toHaveBeenCalledWith(
        user,
        5,
      );
    });

    it('markAllSeen forwards only the token user', async () => {
      mockShareResultRequestService.markAllSeen.mockResolvedValue({
        status: 200,
      });

      await controller.markAllSeen(user);

      expect(mockShareResultRequestService.markAllSeen).toHaveBeenCalledWith(
        user,
      );
      expect(mockShareResultRequestService.markSeen).not.toHaveBeenCalled();
    });

    it('declares PATCH seen-all before PATCH seen/:id, as distinct paths', () => {
      const proto = ShareResultRequestController.prototype as any;
      const route = (name: string) => ({
        path: Reflect.getMetadata(PATH_METADATA, proto[name]),
        method: Reflect.getMetadata(METHOD_METADATA, proto[name]),
      });
      expect(route('markAllSeen')).toEqual({
        path: 'seen-all',
        method: RequestMethod.PATCH,
      });
      expect(route('markSeen')).toEqual({
        path: 'seen/:shareResultRequestId',
        method: RequestMethod.PATCH,
      });
      const order = Object.getOwnPropertyNames(proto);
      expect(order.indexOf('markAllSeen')).toBeLessThan(
        order.indexOf('markSeen'),
      );
    });

    it('binds shareResultRequestId through ParseIntPipe', () => {
      const args = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        ShareResultRequestController,
        'markSeen',
      );
      const paramEntry: any = Object.values(args).find(
        (a: any) => a.data === 'shareResultRequestId',
      );
      expect(paramEntry.pipes).toContain(ParseIntPipe);
    });
  });
});
