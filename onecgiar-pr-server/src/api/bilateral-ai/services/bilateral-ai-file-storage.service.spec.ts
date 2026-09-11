import { BadRequestException } from '@nestjs/common';
import { BilateralAiFileStorageService } from './bilateral-ai-file-storage.service';

describe('BilateralAiFileStorageService', () => {
  let service: BilateralAiFileStorageService;

  beforeEach(() => {
    process.env.BILATERAL_AI_BUCKET_NAME = 'test-bucket';
    process.env.BILATERAL_AI_PREFIX = 'prms/test';
    service = new BilateralAiFileStorageService();
  });

  afterEach(() => {
    delete process.env.BILATERAL_AI_BUCKET_NAME;
    delete process.env.BILATERAL_AI_PREFIX;
  });

  describe('validateSources', () => {
    it('should throw when no sources provided', () => {
      expect(() => service.validateSources([], [])).toThrow(
        BadRequestException,
      );
    });

    it('should throw when no sources and empty text', () => {
      expect(() => service.validateSources([], [], '   ')).toThrow(
        BadRequestException,
      );
    });

    it('should accept text as a valid source', () => {
      expect(() => service.validateSources([], [], 'hello')).not.toThrow();
    });

    it('should throw when more than 6 sources provided', () => {
      const files = Array.from({ length: 4 }, () => ({
        buffer: Buffer.from('x'),
        size: 100,
        originalname: 'doc.pdf',
      }));
      const audio = Array.from({ length: 3 }, () => ({
        buffer: Buffer.from('x'),
        size: 100,
        originalname: 'audio.mp3',
      }));

      expect(() => service.validateSources(files, audio)).toThrow(
        BadRequestException,
      );
    });

    it('should throw when bucket is not configured', () => {
      delete process.env.BILATERAL_AI_BUCKET_NAME;
      service = new BilateralAiFileStorageService();

      expect(() =>
        service.validateSources(
          [
            {
              buffer: Buffer.from('x'),
              size: 100,
              originalname: 'doc.pdf',
            },
          ],
          [],
        ),
      ).toThrow(BadRequestException);
    });

    it('should throw when file exceeds 25 MB', () => {
      const bigFile = {
        buffer: Buffer.alloc(1),
        size: 25_000_001,
        originalname: 'huge.pdf',
      };

      expect(() => service.validateSources([bigFile], [])).toThrow(
        BadRequestException,
      );
    });

    it('should throw when file has no buffer', () => {
      const noBufferFile = {
        size: 100,
        originalname: 'doc.pdf',
      };

      expect(() => service.validateSources([noBufferFile], [])).toThrow(
        BadRequestException,
      );
    });

    it('should throw for unsupported document extension', () => {
      const file = {
        buffer: Buffer.from('x'),
        size: 100,
        originalname: 'image.png',
      };

      expect(() => service.validateSources([file], [])).toThrow(
        BadRequestException,
      );
    });

    it('should accept supported document extensions', () => {
      const extensions = ['pdf', 'docx', 'txt', 'xls', 'xlsx', 'pptx'];

      for (const ext of extensions) {
        const file = {
          buffer: Buffer.from('x'),
          size: 100,
          originalname: `file.${ext}`,
        };
        expect(() => service.validateSources([file], [])).not.toThrow();
      }
    });

    it('should throw for unsupported audio extension', () => {
      const file = {
        buffer: Buffer.from('x'),
        size: 100,
        originalname: 'sound.aac',
      };

      expect(() => service.validateSources([], [file])).toThrow(
        BadRequestException,
      );
    });

    it('should accept supported audio extensions', () => {
      const extensions = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm'];

      for (const ext of extensions) {
        const file = {
          buffer: Buffer.from('x'),
          size: 100,
          originalname: `file.${ext}`,
        };
        expect(() => service.validateSources([], [file])).not.toThrow();
      }
    });

    it('should throw when text exceeds 50,000 characters', () => {
      const longText = 'x'.repeat(50_001);

      expect(() => service.validateSources([], [], longText)).toThrow(
        BadRequestException,
      );
    });

    it('should accept text at exactly 50,000 characters', () => {
      const maxText = 'x'.repeat(50_000);

      expect(() => service.validateSources([], [], maxText)).not.toThrow();
    });
  });

  describe('getBucketName', () => {
    it('should return the configured bucket name', () => {
      expect(service.getBucketName()).toBe('test-bucket');
    });

    it('should throw when bucket is not configured', () => {
      delete process.env.BILATERAL_AI_BUCKET_NAME;
      service = new BilateralAiFileStorageService();

      expect(() => service.getBucketName()).toThrow(BadRequestException);
    });
  });

  describe('uploadFiles', () => {
    it('should throw when bucket is not configured', async () => {
      delete process.env.BILATERAL_AI_BUCKET_NAME;
      service = new BilateralAiFileStorageService();

      await expect(service.uploadFiles('job-1', [])).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should upload files and return stored file metadata', async () => {
      const putObjectMock = {
        promise: jest.fn().mockResolvedValue({}),
      };
      (service as any).s3 = {
        putObject: jest.fn().mockReturnValue(putObjectMock),
      };

      const files = [
        {
          buffer: Buffer.from('content'),
          size: 7,
          originalname: 'test-file.pdf',
          mimetype: 'application/pdf',
        },
      ];

      const result = await service.uploadFiles('job-1', files);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          name: 'test-file.pdf',
          mimeType: 'application/pdf',
          size: 7,
        }),
      );
      expect(result[0].key).toContain('prms/test/job-1/');
    });

    it('should sanitize special characters in filenames', async () => {
      const putObjectMock = {
        promise: jest.fn().mockResolvedValue({}),
      };
      (service as any).s3 = {
        putObject: jest.fn().mockReturnValue(putObjectMock),
      };

      const files = [
        {
          buffer: Buffer.from('x'),
          size: 1,
          originalname: 'my file (1).pdf',
          mimetype: 'application/pdf',
        },
      ];

      const result = await service.uploadFiles('job-1', files);

      expect(result[0].name).toBe('my_file__1_.pdf');
    });

    it('should upload multiple files concurrently', async () => {
      const putObjectMock = {
        promise: jest.fn().mockResolvedValue({}),
      };
      (service as any).s3 = {
        putObject: jest.fn().mockReturnValue(putObjectMock),
      };

      const files = [
        {
          buffer: Buffer.from('a'),
          size: 1,
          originalname: 'a.pdf',
          mimetype: 'application/pdf',
        },
        {
          buffer: Buffer.from('b'),
          size: 1,
          originalname: 'b.docx',
          mimetype: 'application/docx',
        },
      ];

      const result = await service.uploadFiles('job-1', files);

      expect(result).toHaveLength(2);
      expect((service as any).s3.putObject).toHaveBeenCalledTimes(2);
    });
  });
});
