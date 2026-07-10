import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BilateralAutoSaveService } from './bilateral-auto-save.service';

describe('BilateralAutoSaveService', () => {
  let service: BilateralAutoSaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BilateralAutoSaveService],
    });

    service = TestBed.inject(BilateralAutoSaveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register a field', () => {
    service.registerField('title', 'text');
    expect(service.fieldStatus()['title']).toBe('idle');
  });

  it('should set saving status on text field update', () => {
    service.registerField('title', 'text');
    service.updateField('title', 'New Title', 'text');
    expect(service.fieldStatus()['title']).toBe('saving');
  });

  it('should reset all state', () => {
    service.registerField('title', 'text');
    service.updateField('title', 'New Title', 'text');
    service.reset();
    expect(service.fieldStatus()).toEqual({});
    expect(service.hasPendingSaves()).toBe(false);
  });

  it('should set result id', () => {
    service.setResultId(42);
    expect(service.hasPendingSaves()).toBe(false);
  });
});
