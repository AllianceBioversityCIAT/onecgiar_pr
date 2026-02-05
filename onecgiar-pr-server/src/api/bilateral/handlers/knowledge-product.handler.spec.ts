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
    version: { id: 1, phase_year: 2024 },
    year: { year: 2024 },
  };

  const baseAfterContext = {
    resultId: 7,
    userId: 10,
    bilateralDto: { ...baseDto, result_type_id: 6 },
    isDuplicateResult: false,
  };

  let handler: KnowledgeProductBilateralHandler;
  let resultRepository: any;
  let kpService: any;

  beforeEach(() => {
    resultRepository = {
      save: jest.fn().mockResolvedValue({ id: 1 }),
    };
    kpService = {
      populateKPFromCGSpace: jest.fn().mockResolvedValue({
        result_knowledge_product_id: 5,
      }),
    };
    handler = new KnowledgeProductBilateralHandler(
      resultRepository,
      kpService,
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

    it('throws when knowledge_product.handle is missing', async () => {
      await expect(
        handler.initializeResultHeader({
          ...baseInitContext,
          bilateralDto: {
            ...baseDto,
            knowledge_product: { ...baseDto.knowledge_product, handle: '' },
          },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(resultRepository.save).not.toHaveBeenCalled();
    });

    it('creates a new result when knowledge_product and handle are present', async () => {
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

      expect(kpService.populateKPFromCGSpace).not.toHaveBeenCalled();
    });

    it('calls populateKPFromCGSpace to fetch and populate KP metadata', async () => {
      await handler.afterCreate(baseAfterContext);

      expect(kpService.populateKPFromCGSpace).toHaveBeenCalledWith(
        baseAfterContext.resultId,
        baseDto.knowledge_product.handle,
        expect.objectContaining({
          id: baseAfterContext.userId,
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
