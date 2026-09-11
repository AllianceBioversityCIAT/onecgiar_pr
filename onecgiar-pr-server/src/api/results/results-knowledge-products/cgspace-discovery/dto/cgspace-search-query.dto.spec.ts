import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { CgspaceSearchQueryDto } from './cgspace-search-query.dto';

/** Same options the controller applies to `@Query()` (`results-knowledge-products.controller.ts`). */
const controllerValidationPipe = () =>
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

const queryMetadata: ArgumentMetadata = {
  type: 'query',
  metatype: CgspaceSearchQueryDto,
};

describe('CgspaceSearchQueryDto', () => {
  it('should pass validation when a valid query alone is provided', async () => {
    const plain = { query: 'maize' };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.query).toBe('maize');
    expect(dto.page).toBe(0);
    expect(dto.size).toBe(10);
    expect(dto.repository).toEqual(['cgspace', 'melspace', 'worldfish']);
  });

  it('should pass validation when a valid filter alone is provided (no query, year="2026")', async () => {
    const plain = { year: '2026' };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.year).toBe('2026');
  });

  it('should pass validation when type or center filter alone is provided', async () => {
    const dtoType = plainToInstance(CgspaceSearchQueryDto, {
      type: 'Journal Article',
    });
    const errorsType = await validate(dtoType);
    expect(errorsType).toHaveLength(0);

    const dtoCenter = plainToInstance(CgspaceSearchQueryDto, {
      center: 'International Institute of Tropical Agriculture',
    });
    const errorsCenter = await validate(dtoCenter);
    expect(errorsCenter).toHaveLength(0);
  });

  it('should fail validation when no query and no filters are provided', async () => {
    const plain = {};
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const queryError = errors.find((e) => e.property === 'query');
    expect(queryError).toBeDefined();
    expect(Object.values(queryError.constraints || {})).toContain(
      'query is required when no filters are set',
    );
  });

  it('should fail validation when query has less than 3 characters', async () => {
    const plain = { query: 'ab' };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const queryError = errors.find((e) => e.property === 'query');
    expect(queryError).toBeDefined();
  });

  it('should fail validation when query exceeds 200 characters', async () => {
    const plain = { query: 'a'.repeat(201) };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const queryError = errors.find((e) => e.property === 'query');
    expect(queryError).toBeDefined();
  });

  it('should fail validation when size exceeds 25', async () => {
    const plain = { query: 'maize', size: 100 };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const sizeError = errors.find((e) => e.property === 'size');
    expect(sizeError).toBeDefined();
  });

  it('should fail validation when size is less than 1', async () => {
    const plain = { query: 'maize', size: 0 };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const sizeError = errors.find((e) => e.property === 'size');
    expect(sizeError).toBeDefined();
  });

  it('should fail validation when page is negative', async () => {
    const plain = { query: 'maize', page: -1 };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const pageError = errors.find((e) => e.property === 'page');
    expect(pageError).toBeDefined();
  });

  it('should fail validation when repository contains an unknown value', async () => {
    const plain = { query: 'maize', repository: 'foo' };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const repoError = errors.find((e) => e.property === 'repository');
    expect(repoError).toBeDefined();
  });

  it('should fail validation for invalid year formats', async () => {
    for (const invalidYear of ['26', '20261', 'abcd', '202a']) {
      const dto = plainToInstance(CgspaceSearchQueryDto, {
        query: 'maize',
        year: invalidYear,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const yearError = errors.find((e) => e.property === 'year');
      expect(yearError).toBeDefined();
      expect(Object.values(yearError.constraints || {})).toContain(
        'year must be a 4-digit number',
      );
    }
  });

  it('should trim query string whitespace upon transformation', async () => {
    const plain = { query: '  climate change  ' };
    const dto = plainToInstance(CgspaceSearchQueryDto, plain);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.query).toBe('climate change');
  });

  describe('repository list — through the controller ValidationPipe (KPM-R-8, KPM-AC-10)', () => {
    it('should reject an unknown value in a comma-separated list with 400, no upstream call', async () => {
      await expect(
        controllerValidationPipe().transform(
          { query: 'maize', repository: 'cgspace,foo' },
          queryMetadata,
        ),
      ).rejects.toThrow();
    });

    it('should accept the repeatable-param form and keep selection order', async () => {
      const result = await controllerValidationPipe().transform(
        { query: 'maize', repository: ['melspace', 'worldfish'] },
        queryMetadata,
      );

      expect(result.repository).toEqual(['melspace', 'worldfish']);
    });

    it('should lowercase a mixed-case value', async () => {
      const result = await controllerValidationPipe().transform(
        { query: 'maize', repository: 'CGSpace' },
        queryMetadata,
      );

      expect(result.repository).toEqual(['cgspace']);
    });

    it('should default to all three repositories when omitted', async () => {
      const result = await controllerValidationPipe().transform(
        { query: 'maize' },
        queryMetadata,
      );

      expect(result.repository).toEqual(['cgspace', 'melspace', 'worldfish']);
    });

    it('should dedupe a repeated value in a comma-separated list', async () => {
      const result = await controllerValidationPipe().transform(
        { query: 'maize', repository: 'cgspace,cgspace' },
        queryMetadata,
      );

      expect(result.repository).toEqual(['cgspace']);
    });

    it('should reject an empty string with 400 (ArrayMinSize(1) after normalization)', async () => {
      await expect(
        controllerValidationPipe().transform(
          { query: 'maize', repository: '' },
          queryMetadata,
        ),
      ).rejects.toThrow();
    });
  });
});
