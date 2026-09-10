// @akili-spec changes/reporting-favorite-indicators
import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../../../../shared/services/api/api.service';
import { favoriteKeyOf, ReportingFavoritesService } from './reporting-favorites.service';

function apiMock(userId: number | undefined = 7): any {
  return { authSE: userId === undefined ? undefined : { localStorageUser: { id: userId } } };
}

function configure(api: any = apiMock()): void {
  TestBed.configureTestingModule({
    providers: [{ provide: ApiService, useValue: api }]
  });
}

function service(api: any = apiMock()): ReportingFavoritesService {
  configure(api);
  return TestBed.inject(ReportingFavoritesService);
}

describe('favoriteKeyOf', () => {
  it('joins indicator_id, center_id and __aowCode with "::" (RFI-R-3.2)', () => {
    expect(favoriteKeyOf({ indicator_id: 1, center_id: 'c', __aowCode: 'AOW01' })).toBe('1::c::AOW01');
  });

  it('renders a missing center_id as an empty segment', () => {
    expect(favoriteKeyOf({ indicator_id: 1, center_id: undefined, __aowCode: 'AOW01' })).toBe('1::::AOW01');
  });

  it('renders a missing __aowCode as an empty segment', () => {
    expect(favoriteKeyOf({ indicator_id: 1, center_id: 'c', __aowCode: undefined })).toBe('1::c::');
  });

  it('renders both missing as two empty segments', () => {
    expect(favoriteKeyOf({ indicator_id: 42, center_id: undefined, __aowCode: undefined })).toBe('42::::');
  });
});

describe('ReportingFavoritesService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('starts with an empty set for any programme when storage is empty', () => {
    const svc = service();
    expect(svc.setOf('SP01').size).toBe(0);
    expect(svc.isFavorite('SP01', 'k1')).toBe(false);
    expect(svc.count('SP01')).toBe(0);
  });

  it('toggle adds a key, isFavorite/setOf/count reflect it, and it persists as exact JSON (RFI-AC-3)', () => {
    const svc = service(apiMock(7));
    svc.toggle('SP01', 'k1');

    expect(svc.isFavorite('SP01', 'k1')).toBe(true);
    expect([...svc.setOf('SP01')]).toEqual(['k1']);
    expect(svc.count('SP01')).toBe(1);
    expect(localStorage.getItem('pr.reporting.favorites.v1.7')).toBe(JSON.stringify({ SP01: ['k1'] }));
  });

  it('persists across a second service instance (RFI-AC-3)', () => {
    const api = apiMock(7);
    const first = service(api);
    first.toggle('SP01', 'k1');

    TestBed.resetTestingModule();
    const second = service(api);

    expect(second.setOf('SP01').has('k1')).toBe(true);
    expect(second.setOf('SP02').size).toBe(0);
  });

  it('scopes favorites by programme code — a pin in SP01 does not appear in SP02 (RFI-R-3.2)', () => {
    const svc = service();
    svc.toggle('SP01', 'k1');

    expect(svc.setOf('SP01').has('k1')).toBe(true);
    expect(svc.setOf('SP02').has('k1')).toBe(false);
    expect(svc.count('SP02')).toBe(0);
  });

  it('toggle twice removes the key and deletes the empty programme entry from storage', () => {
    const svc = service(apiMock(7));
    svc.toggle('SP01', 'k1');
    svc.toggle('SP01', 'k1');

    expect(svc.setOf('SP01').size).toBe(0);
    expect(svc.byProgram()['SP01']).toBeUndefined();
    expect(localStorage.getItem('pr.reporting.favorites.v1.7')).toBe(JSON.stringify({}));
  });

  it('keeps other programmes intact when one is emptied out', () => {
    const svc = service(apiMock(7));
    svc.toggle('SP01', 'k1');
    svc.toggle('SP02', 'k2');
    svc.toggle('SP01', 'k1');

    expect(localStorage.getItem('pr.reporting.favorites.v1.7')).toBe(JSON.stringify({ SP02: ['k2'] }));
  });

  it('falls back to "anon" when authSE is missing (host specs mock ApiService without it)', () => {
    const svc = service({});
    svc.toggle('SP01', 'k1');

    expect(localStorage.getItem('pr.reporting.favorites.v1.anon')).toBe(JSON.stringify({ SP01: ['k1'] }));
  });

  it('loads as an empty store when localStorage.getItem throws (RFI-AC-4)', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const svc = service();

    expect(svc.setOf('SP01').size).toBe(0);
  });

  it('keeps working in memory for the session when localStorage.setItem throws (RFI-AC-4)', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const svc = service();
    expect(() => svc.toggle('SP01', 'k1')).not.toThrow();

    expect(svc.isFavorite('SP01', 'k1')).toBe(true);
  });

  it('loads a JSON array payload ("[]") as an empty store (RFI-AC-5)', () => {
    localStorage.setItem('pr.reporting.favorites.v1.7', '[]');

    const svc = service(apiMock(7));

    expect(svc.setOf('SP01').size).toBe(0);
    expect(svc.byProgram()).toEqual({});
  });

  it('loads a non-JSON payload ("not json") as an empty store (RFI-AC-5)', () => {
    localStorage.setItem('pr.reporting.favorites.v1.7', 'not json');

    const svc = service(apiMock(7));

    expect(svc.setOf('SP01').size).toBe(0);
  });

  it('loads a valid stored record as-is', () => {
    localStorage.setItem('pr.reporting.favorites.v1.7', JSON.stringify({ SP01: ['k1', 'k2'] }));

    const svc = service(apiMock(7));

    expect([...svc.setOf('SP01')]).toEqual(['k1', 'k2']);
  });
});
