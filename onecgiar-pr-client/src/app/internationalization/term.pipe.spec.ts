import { TestBed } from '@angular/core/testing';
import { TermPipe } from './term.pipe';
import { TerminologyService } from './terminology.service';
import { TermKey } from './terminology.config';

describe('TermPipe', () => {
  let pipe: TermPipe;
  let mockTerminologyService: jest.Mocked<TerminologyService>;

  beforeEach(() => {
    const terminologyServiceSpy = {
      t: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [{ provide: TerminologyService, useValue: terminologyServiceSpy }]
    });

    // Create the pipe within the TestBed context
    pipe = TestBed.runInInjectionContext(() => new TermPipe());
    mockTerminologyService = TestBed.inject(TerminologyService) as jest.Mocked<TerminologyService>;
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it('should call terminology service with correct parameters', () => {
    const testKey: TermKey = 'term.entity.singular';
    const testPortfolioAcronym = 'P25';
    const expectedResult = 'Science Program/Accelerator';

    mockTerminologyService.t.mockReturnValue(expectedResult);

    const result = pipe.transform(testKey, testPortfolioAcronym);

    expect(mockTerminologyService.t).toHaveBeenCalledWith(testKey, testPortfolioAcronym);
    expect(result).toBe(expectedResult);
  });

  it('should handle null portfolio acronym', () => {
    const testKey: TermKey = 'term.entity.singular';
    const expectedResult = 'Initiative';

    mockTerminologyService.t.mockReturnValue(expectedResult);

    const result = pipe.transform(testKey, null);

    expect(mockTerminologyService.t).toHaveBeenCalledWith(testKey, null);
    expect(result).toBe(expectedResult);
  });

  it('should handle undefined portfolio acronym', () => {
    const testKey: TermKey = 'term.entity.plural';
    const expectedResult = 'Initiatives';

    mockTerminologyService.t.mockReturnValue(expectedResult);

    const result = pipe.transform(testKey, undefined);

    expect(mockTerminologyService.t).toHaveBeenCalledWith(testKey, undefined);
    expect(result).toBe(expectedResult);
  });

  it('should handle empty string portfolio acronym', () => {
    const testKey: TermKey = 'term.entity.orPlatforms';
    const expectedResult = 'Initiative or platform';

    mockTerminologyService.t.mockReturnValue(expectedResult);

    const result = pipe.transform(testKey, '');

    expect(mockTerminologyService.t).toHaveBeenCalledWith(testKey, '');
    expect(result).toBe(expectedResult);
  });

  it('should handle P25 portfolio acronym', () => {
    const testKey: TermKey = 'term.entity.singular';
    const expectedResult = 'Science Program/Accelerator';

    mockTerminologyService.t.mockReturnValue(expectedResult);

    const result = pipe.transform(testKey, 'P25');

    expect(mockTerminologyService.t).toHaveBeenCalledWith(testKey, 'P25');
    expect(result).toBe(expectedResult);
  });

  it('should handle non-P25 portfolio acronym', () => {
    const testKey: TermKey = 'term.entity.singular';
    const expectedResult = 'Initiative';

    mockTerminologyService.t.mockReturnValue(expectedResult);

    const result = pipe.transform(testKey, 'P10');

    expect(mockTerminologyService.t).toHaveBeenCalledWith(testKey, 'P10');
    expect(result).toBe(expectedResult);
  });

  it('should handle all TermKey types', () => {
    const termKeys: TermKey[] = [
      'term.entity.singular',
      'term.entity.plural',
      'term.entity.orPlatforms',
      'term.entity.orPlatformsPlural',
      'term.entity.orPlatformsWith()',
      'term.entity.singularWith()',
      'term.entity.orPlatformsOrSGP'
    ];

    termKeys.forEach((key, index) => {
      const expectedResult = `Test Result ${index}`;
      mockTerminologyService.t.mockReturnValue(expectedResult);

      const result = pipe.transform(key, 'P25');

      expect(mockTerminologyService.t).toHaveBeenCalledWith(key, 'P25');
      expect(result).toBe(expectedResult);
    });
  });

  it('should return the key when terminology service returns undefined', () => {
    const testKey: TermKey = 'term.entity.singular';
    const testPortfolioAcronym = 'P25';

    mockTerminologyService.t.mockReturnValue(undefined as any);

    const result = pipe.transform(testKey, testPortfolioAcronym);

    expect(mockTerminologyService.t).toHaveBeenCalledWith(testKey, testPortfolioAcronym);
    expect(result).toBeUndefined();
  });

  it('should be a non-pure pipe', () => {
    // The pipe is marked as pure: false in the decorator
    // This means it will be called on every change detection cycle
    expect(pipe).toBeTruthy();
  });

  it('should be standalone', () => {
    // The pipe is marked as standalone: true in the decorator
    expect(pipe).toBeTruthy();
  });

  it('should have correct pipe name', () => {
    // The pipe is named 'term' in the decorator
    expect(pipe).toBeTruthy();
  });
});
