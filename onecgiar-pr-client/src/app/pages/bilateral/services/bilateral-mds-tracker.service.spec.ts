import { BilateralMdsTrackerService, MdsStatus } from './bilateral-mds-tracker.service';

describe('BilateralMdsTrackerService', () => {
  let service: BilateralMdsTrackerService;

  beforeEach(() => {
    service = new BilateralMdsTrackerService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with all sections empty', () => {
    const statuses = service.sectionStatus();
    expect(statuses.length).toBe(5);
    for (const s of statuses) {
      expect(s.filledFields).toBe(0);
      expect(s.totalFields).toBe(0);
      expect(s.percentage).toBe(0);
      expect(s.status).toBe('empty' as MdsStatus);
      expect(s.fields).toEqual([]);
    }
    expect(service.overallPercentage()).toBe(0);
    expect(service.overallStatus()).toBe('empty');
  });

  it('should set named section fields and derive counts', () => {
    service.setSectionFields('general-info', [
      { key: 'title', label: 'Title', filled: true },
      { key: 'description', label: 'Description', filled: false },
    ]);
    const info = service.sectionStatus().find(s => s.sectionName === 'general-info');
    expect(info?.filledFields).toBe(1);
    expect(info?.totalFields).toBe(2);
    expect(info?.percentage).toBe(50);
    expect(info?.status).toBe('partial');
    expect(info?.fields[0].label).toBe('Title');
  });

  it('should upsert a field group without wiping other groups', () => {
    service.setSectionFields(
      'contributors',
      [
        { key: 'lead-center', label: 'Lead center', filled: true },
        { key: 'lead-project', label: 'Lead project', filled: true },
      ],
      'partners'
    );
    service.setSectionFields(
      'contributors',
      [
        { key: 'toc-planned', label: 'Planned', filled: false },
        { key: 'toc-level', label: 'Level', filled: false },
      ],
      'toc'
    );

    const contrib = service.sectionStatus().find(s => s.sectionName === 'contributors');
    expect(contrib?.totalFields).toBe(4);
    expect(contrib?.filledFields).toBe(2);
    expect(contrib?.fields.filter(f => f.group === 'toc').length).toBe(2);
    expect(contrib?.fields.filter(f => f.group === 'partners').length).toBe(2);
  });

  it('should update section via legacy numeric API', () => {
    service.setTotalFields('general-info', 2);
    service.updateSection('general-info', 2);
    const info = service.sectionStatus().find(s => s.sectionName === 'general-info');
    expect(info?.filledFields).toBe(2);
    expect(info?.percentage).toBe(100);
    expect(info?.status).toBe('complete');
  });

  it('should cap filled fields at total fields (legacy)', () => {
    service.setTotalFields('general-info', 2);
    service.updateSection('general-info', 5);
    const info = service.sectionStatus().find(s => s.sectionName === 'general-info');
    expect(info?.filledFields).toBe(2);
  });

  it('should compute overall percentage from named fields', () => {
    service.setSectionFields('general-info', [
      { key: 'title', label: 'Title', filled: true },
      { key: 'description', label: 'Description', filled: true },
    ]);
    service.setSectionFields('contributors', [
      { key: 'a', label: 'A', filled: true },
      { key: 'b', label: 'B', filled: true },
      { key: 'c', label: 'C', filled: false },
    ]);
    // 2/2 + 2/3 = 4/5 = 80%
    expect(service.overallPercentage()).toBe(80);
  });

  it('should return partial status when some fields filled', () => {
    service.setSectionFields('general-info', [
      { key: 'title', label: 'Title', filled: true },
      { key: 'description', label: 'Description', filled: false },
    ]);
    expect(service.overallStatus()).toBe('partial');
  });

  it('should return complete status at 100%', () => {
    service.setSectionFields('general-info', [
      { key: 'title', label: 'Title', filled: true },
      { key: 'description', label: 'Description', filled: true },
    ]);
    service.setSectionFields('contributors', [
      { key: 'a', label: 'A', filled: true },
    ]);
    service.setSectionFields('geography', [{ key: 'geo', label: 'Geography', filled: true }]);
    service.setSectionFields('evidence', [{ key: 'ev', label: 'Evidence', filled: true }]);
    service.setSectionFields('type-specific', [{ key: 't', label: 'Type', filled: true }]);
    expect(service.overallPercentage()).toBe(100);
    expect(service.overallStatus()).toBe('complete');
  });

  it('should reset all sections', () => {
    service.setSectionFields('general-info', [{ key: 'title', label: 'Title', filled: true }]);
    service.reset();
    expect(service.overallPercentage()).toBe(0);
    for (const s of service.sectionStatus()) {
      expect(s.filledFields).toBe(0);
      expect(s.fields).toEqual([]);
    }
  });

  // P2-3340: an over-limit field is answered but not acceptable. It has to keep counting toward the
  // percentage (otherwise the section silently reopens) while still refusing Submit.
  describe('invalidFields', () => {
    it('is empty while nothing breaks a rule', () => {
      service.setSectionFields('type-specific', [{ key: 'short-title', label: 'Short title', filled: true }]);
      expect(service.invalidFields()).toEqual([]);
    });

    it('collects invalid fields across sections without unfilling them', () => {
      service.setSectionFields('general-info', [{ key: 'title', label: 'Title', filled: true }]);
      service.setSectionFields('type-specific', [
        { key: 'short-title', label: 'Short title', filled: true, invalid: true, invalidReason: 'too long' },
      ]);

      expect(service.invalidFields().map(f => f.key)).toEqual(['short-title']);
      expect(service.overallPercentage()).toBe(100);
      expect(service.overallStatus()).toBe('complete');
    });
  });
});
