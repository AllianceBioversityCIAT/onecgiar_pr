import { BadRequestException } from '@nestjs/common';
import { KnowledgeProductBilateralHandler } from './knowledge-product.handler';

describe('KnowledgeProductBilateralHandler', () => {
  const baseDto: any = {
    title: 'Sample KP',
    description: 'KP description',
    knowledge_product: {
      handle: '123/handle',
      knowledge_product_type: 'Article',
      licence: 'CC-BY',
      metadataCG: {
        source: 'CG',
        is_isi: true,
        accessibility: true,
        issue_year: 2024,
        is_peer_reviewed: true,
      },
    },
  };

  const baseInitContext = {
    bilateralDto: baseDto,
    userId: 10,
    submittedUserId: 20,
    version: { id: 1 },
    year: { year: 2024 },
    lastCode: 100,
  };

  const baseAfterContext = {
    resultId: 7,
    userId: 10,
    bilateralDto: { ...baseDto, result_type_id: 6 },
    isDuplicateResult: false,
  };

  let handler: KnowledgeProductBilateralHandler;
  let resultRepository: any;
  let kpRepository: any;
  let metadataRepository: any;

  beforeEach(() => {
    resultRepository = {
      save: jest.fn().mockResolvedValue({ id: 1 }),
    };
    kpRepository = {
      findOne: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue({
        result_knowledge_product_id: 5,
      }),
    };
    metadataRepository = {
      save: jest.fn(),
    };
    handler = new KnowledgeProductBilateralHandler(
      resultRepository,
      kpRepository,
      metadataRepository,
    );
  });

  describe('initializeResultHeader', () => {
    it('throws when knowledge_product payload is missing', async () => {
      await expect(
        handler.initializeResultHeader({
          ...baseInitContext,
          bilateralDto: { ...baseDto, knowledge_product: undefined },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when KP handle already exists', async () => {
      kpRepository.findOne.mockResolvedValue({
        result_object: { id: 99 },
      });

      await expect(handler.initializeResultHeader(baseInitContext)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('creates a new result when handle is unique', async () => {
      const response = await handler.initializeResultHeader(baseInitContext);

      expect(resultRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: baseDto.title,
          description: baseDto.description,
        }),
      );
      expect(response).toEqual(
        expect.objectContaining({
          resultHeader: expect.objectContaining({ id: 1 }),
        }),
      );
    });
  });

  describe('afterCreate', () => {
    it('skips persistence when handler is invoked for duplicate result', async () => {
      await handler.afterCreate({
        ...baseAfterContext,
        isDuplicateResult: true,
      });

      expect(kpRepository.save).not.toHaveBeenCalled();
    });

    it('persists KP entity and metadata for new handles', async () => {
      await handler.afterCreate(baseAfterContext);

      expect(kpRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          handle: baseDto.knowledge_product.handle,
          name: baseDto.title,
        }),
      );
      expect(metadataRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result_knowledge_product_id: 5,
          source: 'CG',
        }),
      );
    });

    it('throws when knowledge_product is omitted at persistence time', async () => {
      await expect(
        handler.afterCreate({
          ...baseAfterContext,
          bilateralDto: { ...baseDto, knowledge_product: undefined },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
