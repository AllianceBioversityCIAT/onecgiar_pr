// @akili-spec changes/my-work-editing-reorder (MWER-T-1, MWER-R-6)
import { TestBed } from '@angular/core/testing';
import { editingOrderStorageKey, MyWorkEditingOrderService } from './my-work-editing-order.service';

describe('MyWorkEditingOrderService', () => {
  let service: MyWorkEditingOrderService;
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(key => storage[key] ?? null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      storage[key] = value;
    });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(key => {
      delete storage[key];
    });

    TestBed.configureTestingModule({ providers: [MyWorkEditingOrderService] });
    service = TestBed.inject(MyWorkEditingOrderService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('builds the storage key per MWER-R-6', () => {
    expect(editingOrderStorageKey(42, 'SP01', 'Reporting 2026')).toBe('prms.mwb.editing-order.v1::42::SP01::Reporting 2026');
  });

  it('loadForKey reads JSON array from localStorage', () => {
    const key = editingOrderStorageKey(7, 'SP01', 'Reporting 2026');
    storage[key] = JSON.stringify(['9177', '9176']);

    service.loadForKey(7, 'SP01', 'Reporting 2026');

    expect(service.orderedCodes()).toEqual(['9177', '9176']);
    expect(service.hasManualOrder()).toBe(true);
  });

  it('loadForKey is a no-op when the stored sequence is unchanged', () => {
    const key = editingOrderStorageKey(7, 'SP01', 'Reporting 2026');
    storage[key] = JSON.stringify(['9177', '9176']);
    service.loadForKey(7, 'SP01', 'Reporting 2026');
    const firstRef = service.orderedCodes();

    service.loadForKey(7, 'SP01', 'Reporting 2026');

    expect(service.orderedCodes()).toBe(firstRef);
  });

  it('loadForKey fails open on corrupt JSON', () => {
    const key = editingOrderStorageKey(7, 'SP01', 'Reporting 2026');
    storage[key] = '{not-json';

    service.loadForKey(7, 'SP01', 'Reporting 2026');

    expect(service.orderedCodes()).toEqual([]);
  });

  it('save writes to localStorage and updates the signal', () => {
    service.loadForKey(7, 'SP01', 'Reporting 2026');
    service.save(['9176', '9177']);

    const key = editingOrderStorageKey(7, 'SP01', 'Reporting 2026');
    expect(JSON.parse(storage[key]!)).toEqual(['9176', '9177']);
    expect(service.orderedCodes()).toEqual(['9176', '9177']);
  });

  it('clear removes storage and resets the signal', () => {
    service.loadForKey(7, 'SP01', 'Reporting 2026');
    service.save(['9176']);
    service.clear();

    const key = editingOrderStorageKey(7, 'SP01', 'Reporting 2026');
    expect(storage[key]).toBeUndefined();
    expect(service.orderedCodes()).toEqual([]);
    expect(service.hasManualOrder()).toBe(false);
  });

  it('moveItem reorders and persists', () => {
    service.loadForKey(7, 'SP01', 'Reporting 2026');
    service.save(['9176', '9177', '9178']);

    service.moveItem(0, 2);

    expect(service.orderedCodes()).toEqual(['9177', '9178', '9176']);
  });

  it('pruneToExisting drops stale codes', () => {
    service.loadForKey(7, 'SP01', 'Reporting 2026');
    service.save(['9176', '9999', '9177']);

    service.pruneToExisting(['9176', '9177']);

    expect(service.orderedCodes()).toEqual(['9176', '9177']);
  });
});
