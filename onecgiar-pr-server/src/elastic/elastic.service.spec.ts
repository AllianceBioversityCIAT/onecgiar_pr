import { HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ElasticService } from './elastic.service';

describe('ElasticService', () => {
  const mockHttp = {
    post: jest.fn(),
  };
  const mockHandlersError = {
    returnErrorRes: jest.fn().mockReturnValue({
      response: { error: true },
      message: 'INTERNAL_SERVER_ERROR',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
    }),
  };
  const mockResultRepository = {} as any;

  let service: ElasticService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ElasticService(
      mockHttp as any,
      mockHandlersError as any,
      mockResultRepository,
    );
  });

  describe('sendBulkOperationToElastic', () => {
    it('returns OK when all bulk posts succeed', async () => {
      mockHttp.post.mockReturnValue(of({ data: { errors: false } }));
      const res = await service.sendBulkOperationToElastic(['op1', 'op2']);
      expect(res.status).toBe(HttpStatus.OK);
      expect(res.response).toBe(2);
      expect(mockHttp.post).toHaveBeenCalledTimes(2);
    });

    it('logs via HandlersError and rethrows on failure', async () => {
      const failure = { response: { data: { error: 'bulk failed' } } };
      mockHttp.post.mockReturnValue(throwError(() => failure));

      await expect(service.sendBulkOperationToElastic(['op1'])).rejects.toEqual(
        failure,
      );
      expect(mockHandlersError.returnErrorRes).toHaveBeenCalled();
    });
  });
});
