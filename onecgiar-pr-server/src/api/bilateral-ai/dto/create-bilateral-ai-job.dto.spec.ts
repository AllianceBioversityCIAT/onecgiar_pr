import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateBilateralAiJobDto } from './create-bilateral-ai-job.dto';

describe('CreateBilateralAiJobDto', () => {
  const validDto = {
    project_id: 10,
    center_id: 5,
    program_code: 'WLE',
  };

  it('should pass validation with valid required fields', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, validDto);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass validation with optional text field', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      ...validDto,
      text: 'Some context',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when project_id is missing', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      center_id: 5,
      program_code: 'WLE',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('project_id');
  });

  it('should fail when project_id is not an integer', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      project_id: 'not-a-number',
      center_id: 5,
      program_code: 'WLE',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('project_id');
  });

  it('should fail when center_id is missing', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      project_id: 10,
      program_code: 'WLE',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('center_id');
  });

  it('should fail when center_id is not an integer', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      project_id: 10,
      center_id: 'not-a-number',
      program_code: 'WLE',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('center_id');
  });

  it('should fail when program_code is missing', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      project_id: 10,
      center_id: 5,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('program_code');
  });

  it('should fail when program_code is empty', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      project_id: 10,
      center_id: 5,
      program_code: '',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when program_code exceeds 100 characters', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      project_id: 10,
      center_id: 5,
      program_code: 'X'.repeat(101),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass when program_code is exactly 100 characters', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      project_id: 10,
      center_id: 5,
      program_code: 'X'.repeat(100),
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail when text exceeds 50,000 characters', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      ...validDto,
      text: 'X'.repeat(50_001),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass when text is exactly 50,000 characters', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, {
      ...validDto,
      text: 'X'.repeat(50_000),
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should allow text to be undefined', async () => {
    const dto = plainToInstance(CreateBilateralAiJobDto, validDto);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
    expect(dto.text).toBeUndefined();
  });
});
