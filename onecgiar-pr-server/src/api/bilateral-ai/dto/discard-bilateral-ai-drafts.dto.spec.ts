import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DiscardBilateralAiDraftsDto } from './discard-bilateral-ai-drafts.dto';

describe('DiscardBilateralAiDraftsDto', () => {
  const build = (draftIds: unknown) =>
    plainToInstance(DiscardBilateralAiDraftsDto, { draftIds });

  // ABD-S-5.4 — input validation
  it('passes with a list of positive integer ids', async () => {
    const errors = await validate(build([1, 2, 3]));
    expect(errors.length).toBe(0);
  });

  it('fails when draftIds is missing', async () => {
    const errors = await validate(
      plainToInstance(DiscardBilateralAiDraftsDto, {}),
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('draftIds');
  });

  it('fails when draftIds is not an array', async () => {
    const errors = await validate(build('1,2,3'));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('draftIds');
  });

  it('fails on an empty list', async () => {
    const errors = await validate(build([]));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('draftIds');
    expect(Object.keys(errors[0].constraints ?? {})).toContain('arrayNotEmpty');
  });

  it('fails when an id is not an integer (string, float, null)', async () => {
    for (const bad of [['7'], [1.5], [null], [1, 'x', 3]]) {
      const errors = await validate(build(bad));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('draftIds');
    }
  });

  it('fails when an id is below 1 (0 or negative)', async () => {
    for (const bad of [[0], [-4], [3, 0]]) {
      const errors = await validate(build(bad));
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('draftIds');
    }
  });

  it('fails with more than 100 ids', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => i + 1);
    const errors = await validate(build(ids));
    expect(errors.length).toBeGreaterThan(0);
    expect(Object.keys(errors[0].constraints ?? {})).toContain('arrayMaxSize');
  });

  it('passes with exactly 100 ids', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => i + 1);
    const errors = await validate(build(ids));
    expect(errors.length).toBe(0);
  });
});
