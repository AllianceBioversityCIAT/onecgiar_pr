import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import {
  PlatformReportingGuideService,
  buildSpChoicesFromInitiatives,
  computeHasCenterAccess,
  computeHasSpAccess,
  mergeSpChoicesFromCatalog,
  resolveGuideMode
} from './platform-reporting-guide.service';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { ScienceProgramIdService } from '../../../../../../result-framework-reporting/services/science-program-id.service';

describe('platform-reporting-guide pure helpers', () => {
  const personaRows: Array<{
    label: string;
    initiatives: { official_code: string; initiative_id: number }[];
    isAdmin: boolean;
    centers: number;
    expectedMode: ReturnType<typeof resolveGuideMode>;
  }> = [
    { label: 'SP+Center', initiatives: [{ official_code: 'SP01', initiative_id: 1 }], isAdmin: false, centers: 1, expectedMode: 'hub' },
    { label: 'SP only', initiatives: [{ official_code: 'SP01', initiative_id: 1 }], isAdmin: false, centers: 0, expectedMode: 'hub' },
    { label: 'Center only', initiatives: [], isAdmin: false, centers: 2, expectedMode: 'guide-only' },
    { label: 'Neither', initiatives: [], isAdmin: false, centers: 0, expectedMode: 'guide-only' },
    { label: 'Admin no initiatives', initiatives: [], isAdmin: true, centers: 0, expectedMode: 'pick-program' }
  ];

  it.each(personaRows)('$label → modalMode $expectedMode', ({ initiatives, isAdmin, expectedMode }) => {
    const hasSp = computeHasSpAccess(initiatives, isAdmin);
    const choices = buildSpChoicesFromInitiatives(initiatives);
    expect(resolveGuideMode(hasSp, choices.length)).toBe(expectedMode);
  });

  it('multi-SP user → pick-program', () => {
    const initiatives = [
      { official_code: 'SP01', initiative_id: 1, short_name: 'Climate' },
      { official_code: 'SP02', initiative_id: 2, short_name: 'Breeding' }
    ];
    expect(resolveGuideMode(true, buildSpChoicesFromInitiatives(initiatives).length)).toBe('pick-program');
  });

  it('admin catalog merge includes other Science Programs', () => {
    const merged = mergeSpChoicesFromCatalog(
      [{ official_code: 'SP01', initiative_id: 1, short_name: 'Mine' }],
      [{ initiativeCode: 'SP01', initiativeId: 1, initiativeShortName: 'Mine' } as any],
      [{ initiativeCode: 'SP99', initiativeId: 99, initiativeShortName: 'Other' } as any]
    );
    expect(merged.map(c => c.code)).toEqual(['SP01', 'SP99']);
  });

  it('falsifiable: empty initiatives non-admin → guide-only', () => {
    expect(resolveGuideMode(computeHasSpAccess([], false), 0)).toBe('guide-only');
  });

  it('computeHasCenterAccess reflects center count', () => {
    expect(computeHasCenterAccess(0)).toBe(false);
    expect(computeHasCenterAccess(1)).toBe(true);
  });
});

describe('PlatformReportingGuideService', () => {
  let service: PlatformReportingGuideService;
  let apiMock: any;
  let progressMock: jest.Mock;

  beforeEach(() => {
    progressMock = jest.fn().mockReturnValue(
      of({
        response: {
          mySciencePrograms: [{ initiativeCode: 'SP01', initiativeId: 1, initiativeShortName: 'Climate' }],
          otherSciencePrograms: [{ initiativeCode: 'SP02', initiativeId: 2, initiativeShortName: 'Breeding' }]
        }
      })
    );

    apiMock = {
      dataControlSE: {
        myInitiativesListReportingByPortfolio: [{ official_code: 'SP01', initiative_id: 1, short_name: 'Climate' }]
      },
      rolesSE: {
        isAdmin: false,
        getMyCenters: jest.fn().mockReturnValue(['CIAT'])
      }
    };

    TestBed.configureTestingModule({
      providers: [
        PlatformReportingGuideService,
        { provide: ApiService, useValue: apiMock },
        { provide: ScienceProgramIdService, useValue: { progress$: progressMock() } }
      ]
    });

    service = TestBed.inject(PlatformReportingGuideService);
  });

  it('refreshChoices builds spChoices for normal user', () => {
    service.refreshChoices();
    expect(service.spChoices().length).toBe(1);
    expect(service.modalMode()).toBe('hub');
    expect(service.selectedProgramCode()).toBe('SP01');
  });

  it('admin refresh merges catalog programs', () => {
    apiMock.rolesSE.isAdmin = true;
    apiMock.dataControlSE.myInitiativesListReportingByPortfolio = [];
    service.refreshChoices();
    expect(service.spChoices().map(c => c.code)).toEqual(['SP01', 'SP02']);
    expect(service.modalMode()).toBe('pick-program');
  });

  it('admin catalog error falls back to my initiatives', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        PlatformReportingGuideService,
        { provide: ApiService, useValue: apiMock },
        {
          provide: ScienceProgramIdService,
          useValue: { progress$: throwError(() => new Error('network')) }
        }
      ]
    });
    apiMock.rolesSE.isAdmin = true;
    service = TestBed.inject(PlatformReportingGuideService);
    service.refreshChoices();
    expect(service.spChoices().length).toBe(1);
  });
});
