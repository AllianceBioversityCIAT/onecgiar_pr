import { TestBed } from '@angular/core/testing';

import { InstitutionsService } from './institutions.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NEVER, of } from 'rxjs';

describe('InstitutionsService', () => {
  let service: InstitutionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(InstitutionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * P2-3335. The catalogue resolves after the screen is drawn. A `computed()` reading the plain array caches its
   * first (empty) result forever, which left the "Other(s) External Partners" dropdown on "No information found".
   * The signal must carry the same list so those consumers recompute when the response lands.
   */
  it('publishes the partner catalogue on a signal, matching the plain array', () => {
    const institutions = [
      { institutions_id: 1, institutions_name: 'Partner One', institutions_type_name: 'NGO', institutions_type_id: 10, is_center: '0' },
      { institutions_id: 2, institutions_name: 'A Center', institutions_type_name: 'CGIAR', institutions_type_id: 20, is_center: '1' },
      { institutions_id: 3, institutions_name: 'Partner Two', institutions_type_name: 'University', institutions_type_id: 30, is_center: '0' }
    ];
    const api = {
      resultsSE: {
        GET_allInstitutions: jest.fn(() => of({ response: institutions })),
        GET_allInstitutionTypes: jest.fn(() => of({ response: [] })),
        GET_allChildlessInstitutionTypes: jest.fn(() => of({ response: [] }))
      }
    };

    const fresh = new InstitutionsService(api as any);

    // Centers are excluded from the partner list, so only the two non-centers survive.
    expect(fresh.institutionsWithoutCentersPartners().map((i: any) => i.institutions_id)).toEqual([1, 3]);
    // Both views of the same catalogue must never disagree.
    expect(fresh.institutionsWithoutCentersPartners()).toEqual(fresh.institutionsWithoutCentersListPartners);
    // The shape consumers rely on is preserved.
    expect(fresh.institutionsWithoutCentersPartners()[0].obj_institutions.obj_institution_type_code.name).toBe('NGO');
  });

  it('starts empty before the catalogue resolves', () => {
    const api = {
      resultsSE: {
        GET_allInstitutions: jest.fn(() => NEVER),
        GET_allInstitutionTypes: jest.fn(() => NEVER),
        GET_allChildlessInstitutionTypes: jest.fn(() => NEVER)
      }
    };

    const fresh = new InstitutionsService(api as any);

    expect(fresh.institutionsWithoutCentersPartners()).toEqual([]);
  });
});
