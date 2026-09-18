import { readFileSync } from 'fs';
import { join } from 'path';
import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { WordCounterService } from '../../../../shared/services/word-counter.service';
import { ApiService } from '../../../../shared/services/api/api.service';
import { PhasesService } from '../../../../shared/services/global/phases.service';
import { KpCgspaceBrowseComponent } from '../../../result-framework-reporting/pages/entity-aow/pages/entity-aow-aow/components/aow-hlo-table/components/aow-hlo-table-create-modal/components/kp-cgspace-browse/kp-cgspace-browse.component';
import { resolveLegacyTypeForDepthSearch } from '../../shared/bilateral-title-legacy-type';
import { BILATERAL_MANUAL_CREATE_COPY } from '../../../../internationalization/bilateral-manual-create.copy';
import { BilateralManualCreateFormComponent } from './bilateral-manual-create-form.component';

const MISSING = BILATERAL_MANUAL_CREATE_COPY.missingFieldLabels;

@Component({
  selector: 'app-kp-cgspace-browse',
  template: '',
  standalone: true
})
class KpCgspaceBrowseStubComponent {
  readonly busy = input(false);
  readonly showBusyOverlay = input(false);
  readonly phaseYear = input(2026);
  readonly isAdmin = input(false);
  readonly itemSelected = output<any>();
  readonly switchToManual = output<void>();
}

function makeApiMock() {
  return {
    dataControlSE: { reportingCurrentPhase: { phaseYear: 2026 } },
    rolesSE: { isAdmin: false },
    resultsSE: {
      GET_checkTitleUniqueness: jest.fn().mockReturnValue(of({ response: { isUnique: true } })),
      GET_depthSearch: jest.fn().mockReturnValue(of([])),
      GET_mqapValidation: jest
        .fn()
        .mockReturnValue(of({ response: { title: 'Retrieved KP title', metadata: [{ source: 'CGSpace' }] } }))
    }
  };
}

describe('BilateralManualCreateFormComponent', () => {
  let fixture: ComponentFixture<BilateralManualCreateFormComponent>;
  let component: BilateralManualCreateFormComponent;
  let api: ReturnType<typeof makeApiMock>;

  async function setup() {
    api = makeApiMock();
    await TestBed.configureTestingModule({
      imports: [BilateralManualCreateFormComponent],
      providers: [
        WordCounterService,
        { provide: ApiService, useValue: api },
        { provide: PhasesService, useValue: { phases: { reporting: [{ id: 9, phase_name: '2025' }] } } }
      ]
    })
      .overrideComponent(BilateralManualCreateFormComponent, {
        remove: { imports: [KpCgspaceBrowseComponent] },
        add: { imports: [KpCgspaceBrowseStubComponent] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(BilateralManualCreateFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await setup();
  });

  function fillNonKpForm(title = 'Valid bilateral title') {
    component.onLevelSelected(4);
    component.onTypeSelected(8);
    component.onTitleInput(title);
  }

  function completeTitleGate() {
    tick(500);
    fixture.detectChanges();
  }

  it('lists missing fields for an empty form after type gate', () => {
    expect(component.missingFields()).toEqual([MISSING.resultLevel]);
    component.onLevelSelected(4);
    expect(component.missingFields()).toEqual([MISSING.resultType]);
    component.onTypeSelected(8);
    expect(component.missingFields()).toEqual([MISSING.resultTitle]);
  });

  it('blocks create when title exceeds 30 words', () => {
    component.onLevelSelected(4);
    component.onTypeSelected(8);
    component.onTitleInput(Array.from({ length: 31 }, (_, i) => `word${i}`).join(' '));
    expect(component.missingFields()).toContain(MISSING.titleTooLong);
    expect(component.canCreate()).toBe(false);
  });

  it('offers only output types for level 4', () => {
    component.onLevelSelected(4);
    const labels = component.availableResultTypes().map(t => t.label);
    expect(labels).toContain('Knowledge Product');
    expect(labels).not.toContain('Policy Change');
  });

  it('resets type and title when level changes', () => {
    component.onLevelSelected(4);
    component.onTypeSelected(6);
    component.onTitleInput('Draft title');
    component.onLevelSelected(3);
    expect(component.resultTypeId()).toBeNull();
    expect(component.title()).toBe('');
  });

  it('emits create payload when valid after title gate passes', fakeAsync(() => {
    const spy = jest.spyOn(component.create, 'emit');
    fillNonKpForm();
    completeTitleGate();
    expect(component.canCreate()).toBe(true);
    component.onCreateClick();
    expect(spy).toHaveBeenCalledWith({
      levelId: 4,
      typeId: 8,
      title: 'Valid bilateral title'
    });
  }));

  it('does not emit create when invalid', () => {
    const spy = jest.spyOn(component.create, 'emit');
    component.onLevelSelected(4);
    component.onTypeSelected(8);
    component.onCreateClick();
    expect(spy).not.toHaveBeenCalled();
    expect(component.showValidationErrors()).toBe(true);
  });

  it('disables submit while creating input is true', fakeAsync(() => {
    fillNonKpForm();
    completeTitleGate();
    fixture.componentRef.setInput('creating', true);
    fixture.detectChanges();
    expect(component.canCreate()).toBe(false);
  }));

  it('shows a full-form creating overlay with spinner while create is in flight', fakeAsync(() => {
    fillNonKpForm();
    completeTitleGate();
    fixture.componentRef.setInput('creating', true);
    fixture.detectChanges();

    const overlay = fixture.nativeElement.querySelector('[data-testid="bmcf-creating-overlay"]');
    expect(overlay).toBeTruthy();
    expect(overlay.getAttribute('role')).toBe('status');
    expect(overlay.querySelector('.bmcf-creating-overlay-spinner')).toBeTruthy();
    expect(overlay.textContent).toContain('Creating…');
  }));

  describe('title uniqueness gate (BIL-MCD-T-4)', () => {
    it('blocks create when exact duplicate found', fakeAsync(() => {
      api.resultsSE.GET_checkTitleUniqueness.mockReturnValue(
        of({ response: { isUnique: false, existing: { id: 1, title: 'Taken', result_code: 100, version_id: 9 } } })
      );
      fillNonKpForm('Taken title');
      completeTitleGate();
      expect(component.blockingExactTitleFound()).toBe(true);
      expect(component.missingFields()).toContain(MISSING.titleExists);
      expect(component.canCreate()).toBe(false);
      const spy = jest.spyOn(component.create, 'emit');
      component.onCreateClick();
      expect(spy).not.toHaveBeenCalled();
    }));

    it('sets titleCheckFailed when uniqueness gate errors', fakeAsync(() => {
      api.resultsSE.GET_checkTitleUniqueness.mockReturnValue(throwError(() => new Error('network')));
      fillNonKpForm();
      completeTitleGate();
      expect(component.titleCheckFailed()).toBe(true);
      expect(component.missingFields()).toContain(MISSING.titleCheckFailed);
      expect(component.canCreate()).toBe(false);
    }));

    it('blocks create while title check is in flight', () => {
      fillNonKpForm();
      expect(component.loadingTitleCheck()).toBe(true);
      expect(component.canCreate()).toBe(false);
    });

    it('shows similar titles without blocking create', fakeAsync(() => {
      api.resultsSE.GET_depthSearch.mockReturnValue(
        of([{ id: 42, title: 'Similar output', version_id: 9 }])
      );
      fillNonKpForm('Unique title');
      completeTitleGate();
      expect(component.depthSearchList().length).toBe(1);
      expect(component.blockingExactTitleFound()).toBe(false);
      expect(component.canCreate()).toBe(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="similar-titles-list"]')).toBeTruthy();
    }));

    it('maps Policy Change to Policy legacy type in depth search', fakeAsync(() => {
      component.onLevelSelected(3);
      component.onTypeSelected(1);
      component.onTitleInput('Policy draft');
      tick(500);
      expect(api.resultsSE.GET_depthSearch).toHaveBeenCalledWith('Policy draft', 'Policy');
    }));
  });

  describe('KP browse and manual entry (BIL-MCD-T-5)', () => {
    it('template embeds kp-cgspace-browse', () => {
      const html = readFileSync(
        join(__dirname, 'bilateral-manual-create-form.component.html'),
        'utf8'
      );
      expect(html).toContain('app-kp-cgspace-browse');
    });

    it('forwards project and program context to kp-cgspace-browse (KPPJ-R-9)', () => {
      const html = readFileSync(
        join(__dirname, 'bilateral-manual-create-form.component.html'),
        'utf8'
      );
      expect(html.indexOf('[projectCode]="projectCode()"')).toBeGreaterThan(-1);
      expect(html.indexOf('[projectTitle]="projectTitle()"')).toBeGreaterThan(-1);
      expect(html.indexOf('[programCode]="programCode()"')).toBeGreaterThan(-1);
      expect(html.indexOf('[programName]="programName()"')).toBeGreaterThan(-1);
    });

    it('requires synced handle for knowledge product type', () => {
      component.onLevelSelected(4);
      component.onTypeSelected(6);
      expect(component.missingFields()).toContain(MISSING.repositoryHandle);
      expect(component.canCreate()).toBe(false);
    });

    it('renders browse stub when KP type selected without sync', () => {
      component.onLevelSelected(4);
      component.onTypeSelected(6);
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('app-kp-cgspace-browse'))).toBeTruthy();
    });

    it('prefers handleUrl over itemUrl when storing the synced KP link', fakeAsync(() => {
      component.onLevelSelected(4);
      component.onTypeSelected(6);
      component.onCgspaceItemSelected({
        uuid: 'b874412c-c6ba-4f68-b423-c8b785a2ad4e',
        handle: '10568/128401',
        handleUrl: 'https://hdl.handle.net/10568/128401',
        itemUrl: 'https://cgspace.cgiar.org/items/b874412c-c6ba-4f68-b423-c8b785a2ad4e',
        title: 'Browse title',
        type: 'Article',
        year: 2025,
        authors: [],
        affiliations: [],
        countries: [],
        doi: null,
        uri: '',
        repository: 'cgspace'
      });
      tick(500);
      expect(api.resultsSE.GET_mqapValidation).toHaveBeenCalledWith(
        'https://hdl.handle.net/10568/128401'
      );
      expect(component.kpHandle()).toBe('https://hdl.handle.net/10568/128401');
    }));

    it('populates title and handle after browse selection + MQAP sync', fakeAsync(() => {
      component.onLevelSelected(4);
      component.onTypeSelected(6);
      component.onCgspaceItemSelected({
        uuid: 'u1',
        handle: '20.500.12348/123',
        handleUrl: 'https://hdl.handle.net/20.500.12348/123',
        itemUrl: 'https://hdl.handle.net/20.500.12348/123',
        title: 'Browse title',
        type: 'Article',
        year: 2025,
        authors: [],
        affiliations: [],
        countries: [],
        doi: null,
        uri: '',
        repository: 'cgspace'
      });
      tick(500);
      expect(api.resultsSE.GET_mqapValidation).toHaveBeenCalled();
      expect(component.kpHandleSynced()).toBe(true);
      expect(component.title()).toBe('Retrieved KP title');
      expect(component.titleReadOnly()).toBe(true);
    }));

    it('surfaces validator error for invalid manual handle', () => {
      component.onLevelSelected(4);
      component.onTypeSelected(6);
      component.kpEntryMode.set('manual');
      component.syncKpHandle();
      expect(component.kpHandleError().status).toBe(true);
      expect(api.resultsSE.GET_mqapValidation).not.toHaveBeenCalled();
    });

    it('emits handle in create payload for synced KP', fakeAsync(() => {
      const spy = jest.spyOn(component.create, 'emit');
      component.onLevelSelected(4);
      component.onTypeSelected(6);
      component.onKpHandleInput('https://hdl.handle.net/20.500.12348/999');
      component.syncKpHandle();
      tick(500);
      completeTitleGate();
      component.onCreateClick();
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          typeId: 6,
          handle: 'https://hdl.handle.net/20.500.12348/999'
        })
      );
    }));
  });
});

describe('resolveLegacyTypeForDepthSearch', () => {
  it('maps bilateral result types to legacy buckets', () => {
    expect(resolveLegacyTypeForDepthSearch(1)).toBe('Policy');
    expect(resolveLegacyTypeForDepthSearch(7)).toBe('Innovation');
    expect(resolveLegacyTypeForDepthSearch(4)).toBe('OICR');
    expect(resolveLegacyTypeForDepthSearch(8)).toBe('OICR');
    expect(resolveLegacyTypeForDepthSearch(6)).toBe('');
  });
});
