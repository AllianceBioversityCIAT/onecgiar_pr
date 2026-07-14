import { BilateralMdsTrackerService, MdsStatus } from './bilateral-mds-tracker.service';

describe('BilateralMdsTrackerService', () => {
  let service: BilateralMdsTrackerService;

  beforeEach(() => {
    service = new BilateralMdsTrackerService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with all sections at 0', () => {
    const statuses = service.sectionStatus();
    expect(statuses.length).toBe(5);
    for (const s of statuses) {
      expect(s.filledFields).toBe(0);
      expect(s.percentage).toBe(0);
      expect(s.status).toBe('empty' as MdsStatus);
    }
    expect(service.overallPercentage()).toBe(0);
    expect(service.overallStatus()).toBe('empty');
  });

  it('should update section filled fields', () => {
    service.updateSection('general-info', 2);
    const info = service.sectionStatus().find(s => s.sectionName === 'general-info');
    expect(info?.filledFields).toBe(2);
    expect(info?.percentage).toBe(100);
    expect(info?.status).toBe('complete');
  });

  it('should cap filled fields at total fields', () => {
    service.updateSection('general-info', 5);
    const info = service.sectionStatus().find(s => s.sectionName === 'general-info');
    expect(info?.filledFields).toBe(2);
  });

  it('should compute overall percentage', () => {
    service.updateSection('general-info', 2);
    service.updateSection('contributors', 2);
    expect(service.overallPercentage()).toBe(22);
  });

  it('should return partial status at 50%', () => {
    service.updateSection('general-info', 1);
    expect(service.overallStatus()).toBe('partial');
  });

  it('should return complete status at 100%', () => {
    service.updateSection('general-info', 2);
    service.updateSection('contributors', 4);
    service.updateSection('geography', 3);
    service.updateSection('evidence', 2);
    service.updateSection('type-specific', 5);
    service.updateSection('contributors', 6);
    expect(service.overallPercentage()).toBe(100);
    expect(service.overallStatus()).toBe('complete');
  });

  it('should reset all sections to zero', () => {
    service.updateSection('general-info', 2);
    service.reset();
    expect(service.overallPercentage()).toBe(0);
    for (const s of service.sectionStatus()) {
      expect(s.filledFields).toBe(0);
    }
  });
});
