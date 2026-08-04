import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { BilateralAiTextMiningService } from './bilateral-ai-text-mining.service';

describe('BilateralAiTextMiningService', () => {
  let service: BilateralAiTextMiningService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    delete process.env.MICROSERVICE_API_KEY;
    httpService = {
      post: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BilateralAiTextMiningService,
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get<BilateralAiTextMiningService>(
      BilateralAiTextMiningService,
    );
  });

  afterEach(() => {
    delete process.env.MICROSERVICE_API_KEY;
    delete process.env.BILATERAL_AI_TEXT_MINING_URL;
    delete process.env.BILATERAL_AI_TEXT_MINING_API_KEY;
    jest.restoreAllMocks();
  });

  describe('extract', () => {
    it('should throw ServiceUnavailableException when URL is not configured', async () => {
      delete process.env.BILATERAL_AI_TEXT_MINING_URL;
      delete process.env.BILATERAL_AI_TEXT_MINING_API_KEY;

      await expect(
        service.extract({
          bucketName: 'b',
          keys: [],
          audio_keys: [],
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('should throw ServiceUnavailableException when API key is not configured', async () => {
      process.env.BILATERAL_AI_TEXT_MINING_URL = 'https://ai.example.com';
      delete process.env.BILATERAL_AI_TEXT_MINING_API_KEY;

      await expect(
        service.extract({
          bucketName: 'b',
          keys: [],
          audio_keys: [],
        }),
      ).rejects.toThrow(ServiceUnavailableException);

      delete process.env.BILATERAL_AI_TEXT_MINING_URL;
    });

    it('should post to the text mining endpoint with correct headers', async () => {
      process.env.BILATERAL_AI_TEXT_MINING_URL = 'https://ai.example.com';
      process.env.BILATERAL_AI_TEXT_MINING_API_KEY = 'test-key';

      httpService.post.mockReturnValue(of({ data: { results: [] } }) as any);

      await service.extract({
        bucketName: 'my-bucket',
        keys: ['k1', 'k2'],
        audio_keys: ['a1'],
        text: 'hello',
        user_id: 'user@cgiar.org',
      });

      expect(httpService.post).toHaveBeenCalledWith(
        'https://ai.example.com/prms/text-mining',
        {
          bucketName: 'my-bucket',
          keys: ['k1', 'k2'],
          audio_keys: ['a1'],
          text: 'hello',
          user_id: 'user@cgiar.org',
        },
        expect.objectContaining({
          headers: {
            'X-API-Key': 'test-key',
            'Content-Type': 'application/json',
          },
        }),
      );

      delete process.env.BILATERAL_AI_TEXT_MINING_URL;
      delete process.env.BILATERAL_AI_TEXT_MINING_API_KEY;
    });

    it('should strip trailing slash from URL', async () => {
      process.env.BILATERAL_AI_TEXT_MINING_URL = 'https://ai.example.com/';
      process.env.BILATERAL_AI_TEXT_MINING_API_KEY = 'key';

      httpService.post.mockReturnValue(of({ data: {} }) as any);

      await service.extract({
        bucketName: 'b',
        keys: [],
        audio_keys: [],
      });

      expect(httpService.post).toHaveBeenCalledWith(
        'https://ai.example.com/prms/text-mining',
        expect.anything(),
        expect.anything(),
      );

      delete process.env.BILATERAL_AI_TEXT_MINING_URL;
      delete process.env.BILATERAL_AI_TEXT_MINING_API_KEY;
    });

    it('should return response data on success', async () => {
      process.env.BILATERAL_AI_TEXT_MINING_URL = 'https://ai.example.com';
      process.env.BILATERAL_AI_TEXT_MINING_API_KEY = 'key';

      const responseData = { json_content: { results: [{ title: 'R1' }] } };
      httpService.post.mockReturnValue(of({ data: responseData }) as any);

      const result = await service.extract({
        bucketName: 'b',
        keys: [],
        audio_keys: [],
      });

      expect(result).toEqual(responseData);

      delete process.env.BILATERAL_AI_TEXT_MINING_URL;
      delete process.env.BILATERAL_AI_TEXT_MINING_API_KEY;
    });

    it('should throw error with status from HTTP response on failure', async () => {
      process.env.BILATERAL_AI_TEXT_MINING_URL = 'https://ai.example.com';
      process.env.BILATERAL_AI_TEXT_MINING_API_KEY = 'key';

      const httpError = {
        response: { status: 500, data: { detail: 'Internal error' } },
      };
      httpService.post.mockReturnValue(throwError(() => httpError) as any);

      await expect(
        service.extract({ bucketName: 'b', keys: [], audio_keys: [] }),
      ).rejects.toThrow('Internal error');

      delete process.env.BILATERAL_AI_TEXT_MINING_URL;
      delete process.env.BILATERAL_AI_TEXT_MINING_API_KEY;
    });

    it('should use default error message when detail is missing', async () => {
      process.env.BILATERAL_AI_TEXT_MINING_URL = 'https://ai.example.com';
      process.env.BILATERAL_AI_TEXT_MINING_API_KEY = 'key';

      const httpError = { response: { status: 502, data: {} } };
      httpService.post.mockReturnValue(throwError(() => httpError) as any);

      await expect(
        service.extract({ bucketName: 'b', keys: [], audio_keys: [] }),
      ).rejects.toThrow('Text mining service request failed.');

      delete process.env.BILATERAL_AI_TEXT_MINING_URL;
      delete process.env.BILATERAL_AI_TEXT_MINING_API_KEY;
    });
  });

  describe('normalize', () => {
    it('should extract results from json_content when present', () => {
      const response = {
        json_content: { results: [{ title: 'R1' }, { title: 'R2' }] },
      };

      const result = service.normalize(response);

      expect(result.results).toEqual([{ title: 'R1' }, { title: 'R2' }]);
    });

    it('should fall back to top-level results when json_content is absent', () => {
      const response = { results: [{ title: 'R3' }] };

      const result = service.normalize(response);

      expect(result.results).toEqual([{ title: 'R3' }]);
    });

    it('should return empty array when no results exist', () => {
      const result = service.normalize({});

      expect(result.results).toEqual([]);
      expect(result.interactionId).toBeNull();
    });

    it('should return empty array when results is not an array', () => {
      const result = service.normalize({ results: 'not-an-array' });

      expect(result.results).toEqual([]);
    });

    it('should extract interaction_id from response', () => {
      const result = service.normalize({
        interaction_id: 'int-abc',
        results: [],
      });

      expect(result.interactionId).toBe('int-abc');
    });

    it('should return null interactionId when not present', () => {
      const result = service.normalize({ results: [] });

      expect(result.interactionId).toBeNull();
    });

    it('should prioritize json_content.results over top-level results', () => {
      const response = {
        json_content: { results: [{ title: 'inner' }] },
        results: [{ title: 'outer' }],
      };

      const result = service.normalize(response);

      expect(result.results).toEqual([{ title: 'inner' }]);
    });
  });
});
