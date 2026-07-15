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

  it('should cap contributors at 3', () => {
    service.updateSection('contributors', 6);
    const contrib = service.sectionStatus().find(s => s.sectionName === 'contributors');
    expect(contrib?.filledFields).toBe(3);
    expect(contrib?.totalFields).toBe(3);
  });

  it('should compute overall percentage', () => {
    service.updateSection('general-info', 2);
    service.updateSection('contributors', 2);
    // general-info 2/2 + contributors 2/3 + geography 0/1 + evidence 0/1 + type-specific 0/0 = 4/7
    expect(service.overallPercentage()).toBe(57);
  });

  it('should return partial status at 50%', () => {
    service.updateSection('general-info', 1);
    expect(service.overallStatus()).toBe('partial');
  });

  it('should return complete status at 100%', () => {
    service.setTotalFields('type-specific', 5);
    service.updateSection('general-info', 2);
    service.updateSection('contributors', 3);
    service.updateSection('geography', 3);
    service.updateSection('evidence', 1);
    service.updateSection('type-specific', 5);
    expect(service.overallPercentage()).toBe(100);
    expect(service.overallStatus()).toBe('complete');
  });

  it('should use dynamic totalFields via setTotalFields override', () => {
    service.setTotalFields('type-specific', 3);
    const ts = service.sectionStatus().find(s => s.sectionName === 'type-specific');
    expect(ts?.totalFields).toBe(3);

    service.updateSection('type-specific', 2);
    const tsAfter = service.sectionStatus().find(s => s.sectionName === 'type-specific');
    expect(tsAfter?.filledFields).toBe(2);
    expect(tsAfter?.percentage).toBe(67);
    expect(tsAfter?.status).toBe('partial');
  });

  it('should cap type-specific at overridden totalFields', () => {
    service.setTotalFields('type-specific', 3);
    service.updateSection('type-specific', 10);
    const ts = service.sectionStatus().find(s => s.sectionName === 'type-specific');
    expect(ts?.filledFields).toBe(3);
    expect(ts?.percentage).toBe(100);
    expect(ts?.status).toBe('complete');
  });

  it('should reset overrides on reset()', () => {
    service.setTotalFields('type-specific', 4);
    service.updateSection('type-specific', 4);
    service.reset();
    const ts = service.sectionStatus().find(s => s.sectionName === 'type-specific');
    expect(ts?.totalFields).toBe(0);
    expect(ts?.filledFields).toBe(0);
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
