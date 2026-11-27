import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { signal } from '@angular/core';

import { TypeInnovationUseComponent } from './type-innovation-use.component';
import { BilateralApiService } from '../../../../../shared/services/api/bilateral-api.service';
import { BilateralCreationService } from '../../../services/bilateral-creation.service';
import { BilateralMdsTrackerService } from '../../../services/bilateral-mds-tracker.service';
import { BilateralAutoSaveService } from '../../../services/bilateral-auto-save.service';
import { BilateralExpandableStateService } from '../../../services/bilateral-expandable-state.service';
import { InnovationControlListService } from '../../../../../shared/services/global/innovation-control-list.service';
import { QaInnovationDevelopmentResultsService } from '../../../../../shared/services/global/qa-innovation-development-results.service';

/**
 * Tester suite for changes/innovation-use-2026-w3-pooled-alignment (spec commit e5654d462).
 * Covers what the author's IWA-T-1 tests do not: the Organizations tile fed from the main block,
 * "to be determined" with full metadata open, the read-only wrapper, the W3 Farmers copy (IWA-R-4)
 * and an unchanged save-payload shape across the 2026 gate (IWA-R-5). Real template, no overrides.
 */
describe('TypeInnovationUseComponent — IWA tester suite (real template)', () => {
  let fixture: ComponentFixture<TypeInnovationUseComponent>;
  let component: TypeInnovationUseComponent;
  let creation: any;
  let autoSave: any;
  let bilateralApi: any;

  const rows = () => ({
    actors: [{ actor_type_id: 1, how_many: 3, sex_and_age_disaggregation: true, addressing_demands: 'x', is_active: true }],
    organization: [{ institution_types_id: 20, how_many: 2, addressing_demands: 'y', is_active: true }]
  });

  const open = (year: number, extra: Record<string, unknown> = {}) => {
    creation.reportingYear.set(year);
    bilateralApi.GET_innovationUse.mockReturnValue(of({ response: { innov_use_to_be_determined: false, ...rows(), ...extra } }));
    fixture = TestBed.createComponent(TypeInnovationUseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const root = (): HTMLElement => fixture.nativeElement;
  const header = (label: string): HTMLElement | undefined =>
    Array.from(root().querySelectorAll<HTMLElement>('app-pr-field-header')).find(h => (h.textContent ?? '').trim().startsWith(label));
  const headerCount = (label: string) =>
    Array.from(root().querySelectorAll('app-pr-field-header')).filter(h => (h.textContent ?? '').trim().startsWith(label)).length;
  const expandFullMetadata = () => {
    component.showAllFields.set(true);
    fixture.detectChanges();
  };
  const orgTileValue = (): string | null => {
    const tiles = root().querySelector('[data-testid="iu-totals"]');
    if (!tiles) return null;
    const tile = Array.from(tiles.children).find(t => (t.textContent ?? '').includes(component.currentUseCopy.categoryLabels.organizations));
    return tile ? (tile.lastElementChild?.textContent ?? '').trim() : null;
  };
  const lastPayload = () => autoSave.schedulePayload.mock.calls.at(-1)[1] as any;

  beforeEach(async () => {
    autoSave = { isReadOnly: signal(false), fieldStatus: signal<Record<string, string>>({}), schedulePayload: jest.fn(), openSection: signal<string | null>(null) };
    creation = { currentResultId: signal<number | null>(123), reportingYear: signal<number | null>(2026), isEditableByCenterUser: () => true };
    bilateralApi = {
      GET_actorsTypes: jest.fn().mockReturnValue(of({ response: [{ actor_type_id: 1, name: 'Farmer' }] })),
      GET_institutionsTypeTree: jest.fn().mockReturnValue(of({ response: [{ code: 20, name: 'Private sector', childrens: [] }] })),
      GET_innovationUse: jest.fn().mockReturnValue(of({ response: {} })),
      PATCH_innovationUse: jest.fn().mockReturnValue(of({}))
    };
    await TestBed.configureTestingModule({
      imports: [TypeInnovationUseComponent],
      providers: [
        { provide: BilateralApiService, useValue: bilateralApi },
        { provide: BilateralCreationService, useValue: creation },
        { provide: BilateralMdsTrackerService, useValue: { setSectionFields: jest.fn() } },
        { provide: BilateralAutoSaveService, useValue: autoSave },
        { provide: BilateralExpandableStateService, useValue: { getShowAllFields: jest.fn().mockReturnValue(false), setShowAllFields: jest.fn() } },
        { provide: InnovationControlListService, useValue: { useLevelsList: [{ id: '1', level: 0, name: 'No use' }] } },
        { provide: QaInnovationDevelopmentResultsService, useValue: { options: signal([]), load: jest.fn() } }
      ]
    }).compileComponents();
  });

  it('IWA-R-1: with full metadata collapsed, organizations feed the "Organizations" tile and the main-block button adds a row', () => {
    open(2026);
    expect(component.showAllFields()).toBe(false);
    expect(orgTileValue()).toBe('2');

    const addOrg = fixture.debugElement
      .queryAll(By.css('app-add-button'))
      .find(b => ((b.nativeElement as HTMLElement).textContent ?? '').includes('Add organization'));
    expect(addOrg).toBeDefined();
    addOrg!.triggerEventHandler('clickEvent', null);
    fixture.detectChanges();

    expect(component.body.organization.length).toBe(2);
    expect(component.visibleOrganizations.length).toBe(2);
    expect(component.showAllFields()).toBe(false);
    // An empty new row adds nothing; the tile keeps the loaded figure.
    expect(orgTileValue()).toBe('2');
  });

  it('IWA-R-1: 2026 "to be determined" hides Organizations with Actors and measures, also with full metadata expanded', () => {
    open(2026, { innov_use_to_be_determined: true });
    expect(headerCount('Actors')).toBe(0);
    expect(headerCount('Other quantitative measures')).toBe(0);
    expect(headerCount('Organizations')).toBe(0);
    expandFullMetadata();
    expect(headerCount('Organizations')).toBe(0);
    expect(root().querySelector('[data-testid="iu-totals"]')).toBeNull();
  });

  it('IWA-R-1 / DD read-only: the 2026 Organizations block sits inside the same [inert] wrapper as Actors', () => {
    open(2026);
    const orgWrapper = header('Organizations')?.closest('div.contents');
    const actorsWrapper = header('Actors')?.closest('div.contents');
    expect(orgWrapper).toBeTruthy();
    expect(orgWrapper).toBe(actorsWrapper);
  });

  it('IWA-R-4: the W3 2026 Farmers card shows the shortened nature descriptions, word for word, without the two examples', () => {
    open(2026);
    const nature = root().querySelector('[data-testid="iu-use-nature"]');
    expect(nature).not.toBeNull();
    const text = (nature!.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).not.toContain('climate advisories');
    expect(text).not.toContain('actively used a digital tool or service');
    expect(text).toContain(
      'Advisories delivered face-to-face, by SMS, radio/media or a digital platform; market information; dietary guidelines; starter kits, vouchers or other incentives. Receipt is documented; application of the innovation is not confirmed.'
    );
    expect(text).toContain(
      'Grew a variety, applied a practice, took up a product. Application is supported by the attached evidence (survey, plot observation, purchase records, platform logs).'
    );
  });

  it('IWA-R-5: the save payload has the same shape for 2026 and 2025 (the gate changes the screen, not the contract)', () => {
    open(2026);
    component.onFieldChange();
    const p26 = lastPayload();
    fixture.destroy();
    autoSave.schedulePayload.mockClear();
    open(2025);
    component.onFieldChange();
    const p25 = lastPayload();

    expect(Object.keys(p26).sort()).toEqual(Object.keys(p25).sort());
    expect(Object.keys(p26.innovatonUse).sort()).toEqual(Object.keys(p25.innovatonUse).sort());
    expect(Object.keys(p26.innovatonUse.actors[0]).sort()).toEqual(Object.keys(p25.innovatonUse.actors[0]).sort());
    expect(Object.keys(p26.innovatonUse.organization[0]).sort()).toEqual(Object.keys(p25.innovatonUse.organization[0]).sort());
    expect(p26.innovatonUse.organization[0].addressing_demands).toBe('y');
    expect(p25.innovatonUse.organization[0].addressing_demands).toBe('y');
  });
});
