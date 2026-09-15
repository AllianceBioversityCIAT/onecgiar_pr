import { readFileSync } from 'fs';
import { join } from 'path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { InnovationUseInfoComponent } from './innovation-use-info.component';
import { ApiService } from '../../../../../../../shared/services/api/api.service';
import { FieldsManagerService } from '../../../../../../../shared/services/fields-manager.service';
import { DataControlService } from '../../../../../../../shared/services/data-control.service';
import { QaInnovationDevelopmentResultsService } from '../../../../../../../shared/services/global/qa-innovation-development-results.service';

/**
 * P2-3424 — the link to a QA'd Innovation Development result, now asked in THIS section and OPTIONAL.
 *
 * PO decision (Ángel Jarrín, 10 Sep 2026): "la opción B es la correcta … lo mejor es mostrar la
 * información en la sección de Innovation Use. Este campo no debería ser un MDS."
 *
 * The four things that can silently go wrong, one block each:
 * 1. The gate — Innovation use + phase 2026 onwards, never a portfolio check, and nothing at all
 *    while the phase year is unresolved (its twin in Contributors and partners fails the same way,
 *    so the two can never both paint the question nor both hide it).
 * 2. The picker — single selection over an array payload, and a stored link that the catalogue no
 *    longer lists must not vanish (saving the section would wipe it).
 * 3. The save — the P2-3199 defensive re-read must NOT run here any more, or the answer the user
 *    just gave is replaced by the stored one, silently, behind a successful save.
 * 4. Not mandatory — asserted against the template text, because the requiredness of these two
 *    controls is a template fact (`[required]="false"`) and both controls default it to TRUE.
 */
describe('InnovationUseInfoComponent — optional link to a QA’d Innovation Development result (P2-3424)', () => {
  let fixture: ComponentFixture<InnovationUseInfoComponent>;
  let component: InnovationUseInfoComponent;
  let currentResultSignal: any;
  let qaInnovationsSE: any;
  let patchSpy: jest.Mock;
  let getP25Spy: jest.Mock;
  /**
   * How many times the section's GET had run WHEN the PATCH was issued. This is the instrument for
   * "no defensive re-read": counting GET calls after the fact cannot answer it, because the save
   * always reloads the section on success — that reload is a second, legitimate call.
   */
  let getCallsWhenPatched: number;

  const qaOption = (id: number, result_code: number, title: string) => ({
    id,
    result_code,
    title,
    status_id: 2,
    phase_year: 2026,
    acronym: 'P25',
    display: `${result_code} - ${title}`
  });

  const storedP25Response = {
    has_innovation_link: 1,
    linked_results: [7777],
    innovatonUse: { actors: [], organization: [], measures: [] },
    actors: [],
    organization: [],
    measures: []
  };

  beforeEach(async () => {
    currentResultSignal = signal<any>({ portfolio: 'P25', result_type_id: 2, phase_year: 2026 });
    qaInnovationsSE = {
      options: signal([qaOption(9053, 6772, 'Test Geo1'), qaOption(8779, 6508, 'In QA')]),
      loading: signal(false),
      loaded: signal(false),
      isEmpty: signal(false),
      load: jest.fn()
    };
    getCallsWhenPatched = -1;
    getP25Spy = jest.fn().mockReturnValue(of({ response: storedP25Response }));
    patchSpy = jest.fn().mockImplementation(() => {
      getCallsWhenPatched = getP25Spy.mock.calls.length;
      return of({ response: {} });
    });

    await TestBed.configureTestingModule({
      declarations: [InnovationUseInfoComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        {
          provide: ApiService,
          useValue: {
            dataControlSE: { currentResultSectionName: signal<string>('') },
            rolesSE: { readOnly: false },
            resultsSE: {
              GET_innovationUse: jest.fn().mockReturnValue(of({ response: storedP25Response })),
              PATCH_innovationUse: jest.fn().mockReturnValue(of({ response: {} })),
              GET_innovationUseP25: getP25Spy,
              PATCH_innovationUseP25: patchSpy
            }
          }
        },
        { provide: FieldsManagerService, useValue: { isP25: () => true } },
        { provide: DataControlService, useValue: { currentResultSignal } },
        { provide: QaInnovationDevelopmentResultsService, useValue: qaInnovationsSE }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseInfoComponent);
    component = fixture.componentInstance;
  });

  describe('the gate', () => {
    it('is on for an Innovation use result in the 2026 phase', () => {
      expect(component.showsInnovationLink()).toBe(true);
    });

    it('is OFF for a 2025-phase result, even inside the P25 portfolio — it still asks in section 2', () => {
      currentResultSignal.set({ portfolio: 'P25', result_type_id: 2, phase_year: 2025 });
      expect(component.showsInnovationLink()).toBe(false);
    });

    it('is OFF while the phase year is unknown — same fail-towards-the-legacy-form rule as its twin', () => {
      currentResultSignal.set({ portfolio: 'P25', result_type_id: 2 });
      expect(component.showsInnovationLink()).toBe(false);
    });

    it('fetches the catalogue only for the surface that uses it', () => {
      currentResultSignal.set({ portfolio: 'P25', result_type_id: 2, phase_year: 2025 });
      component.ensureQaInnovationCatalogue();
      expect(qaInnovationsSE.load).not.toHaveBeenCalled();

      currentResultSignal.set({ portfolio: 'P25', result_type_id: 2, phase_year: 2026 });
      component.ensureQaInnovationCatalogue();
      expect(qaInnovationsSE.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('single selection over the array payload', () => {
    it('reads the stored id, whether it arrives as a number or as an object', () => {
      component.innovationUseInfoBody.linked_results = [9053];
      expect(component.linkedInnovationId).toBe(9053);

      component.innovationUseInfoBody.linked_results = [{ id: 8779 }] as any;
      expect(component.linkedInnovationId).toBe(8779);
    });

    it('is null when nothing is linked', () => {
      component.innovationUseInfoBody.linked_results = [];
      expect(component.linkedInnovationId).toBeNull();
    });

    it('writes ONE id back into the array the API expects, replacing any previous selection', () => {
      component.linkedInnovationId = 9053;
      expect(component.innovationUseInfoBody.linked_results).toEqual([9053]);

      component.linkedInnovationId = 8779;
      expect(component.innovationUseInfoBody.linked_results).toEqual([8779]);
    });

    it('clears the array when the selection is removed', () => {
      component.innovationUseInfoBody.linked_results = [9053];
      component.linkedInnovationId = null;
      expect(component.innovationUseInfoBody.linked_results).toEqual([]);
    });

    /**
     * Regression. `linked_result` is SHARED: `getLinkedResultsByOrigin`
     * (`results-innovations-use.repository.ts:245-259`) hands this section every active row of the
     * result, whoever wrote it — the P22 "Links to results" section and versioning included — and this
     * single-select can only paint the first one. Writing `[value]` back therefore deleted the rest,
     * because the save sends the array verbatim and `LinkedResultRepository.updateLink`
     * (`linked-results.repository.ts:313-330`) de-activates every active row missing from it.
     *
     * The fixture is real, not invented: result 11164 (code 8696, 2026 phase, `has_innovation_link = 1`)
     * holds exactly these three active links on the test DB, and prtest's
     * `v2/api/innovation-use/get/result/11164` returns them as `["8738","8826","8877"]` — strings,
     * which is also why the ids are quoted here. 28 active Innovation use results were carrying more
     * than one active link when this was measured (11 Sep 2026).
     */
    describe('a result that stores MORE links than this select can show (result 11164)', () => {
      const storedOnServer = () => ['8738', '8826', '8877'] as any;

      it('paints only the first one — the other two are invisible on this screen', () => {
        component.innovationUseInfoBody.linked_results = storedOnServer();
        expect(component.linkedInnovationId).toBe(8738);
      });

      it('replaces ONLY the id on screen when the user picks another innovation', () => {
        component.innovationUseInfoBody.linked_results = storedOnServer();

        component.linkedInnovationId = 9053;

        expect(component.innovationUseInfoBody.linked_results).toEqual([9053, 8826, 8877]);
      });

      it('keeps the invisible ones when the user clears the select', () => {
        component.innovationUseInfoBody.linked_results = storedOnServer();

        component.linkedInnovationId = null;

        expect(component.innovationUseInfoBody.linked_results).toEqual([8826, 8877]);
      });
    });
  });

  describe('the options offered', () => {
    it('offers the QA’d catalogue as it comes, with "[Result ID] - [Result Title]" labels', () => {
      expect(component.qaInnovationOptions.map(option => option.display)).toEqual(['6772 - Test Geo1', '6508 - In QA']);
    });

    it('keeps a stored link that is no longer listed, so saving the section cannot wipe it', () => {
      component.innovationUseInfoBody.linked_results = [7777];

      const [first, ...rest] = component.qaInnovationOptions;
      expect(first).toEqual(expect.objectContaining({ id: 7777, display: '7777 - (linked result outside the QA’d list)' }));
      expect(rest).toHaveLength(2);
    });

    it('does not duplicate a stored link that IS listed', () => {
      component.innovationUseInfoBody.linked_results = [9053];
      expect(component.qaInnovationOptions).toHaveLength(2);
    });
  });

  describe('answering "No"', () => {
    it('clears the linked result', () => {
      component.innovationUseInfoBody.linked_results = [9053];
      component.innovationUseInfoBody.has_innovation_link = false;
      component.onInnovationLinkChange();
      expect(component.innovationUseInfoBody.linked_results).toEqual([]);
    });

    it('leaves the selection alone when the answer is "Yes"', () => {
      component.innovationUseInfoBody.linked_results = [9053];
      component.innovationUseInfoBody.has_innovation_link = true;
      component.onInnovationLinkChange();
      expect(component.innovationUseInfoBody.linked_results).toEqual([9053]);
    });

    it('does nothing when this surface does not own the question (2025 phase)', () => {
      currentResultSignal.set({ portfolio: 'P25', result_type_id: 2, phase_year: 2025 });
      component.innovationUseInfoBody.linked_results = [9053];
      component.innovationUseInfoBody.has_innovation_link = false;
      component.onInnovationLinkChange();
      expect(component.innovationUseInfoBody.linked_results).toEqual([9053]);
    });
  });

  describe('the save contract', () => {
    const savedPayload = () => patchSpy.mock.calls[0][0];

    it('sends the answer the user gave HERE — the P2-3199 re-read must not run for these results', () => {
      component.innovationUseInfoBody.has_innovation_link = true;
      component.innovationUseInfoBody.linked_results = [9053];

      component.onSaveSection();

      // The stored answer (`has_innovation_link: 1`, `linked_results: [7777]`) must NOT win here.
      expect(getCallsWhenPatched).toBe(0);
      expect(savedPayload().has_innovation_link).toBe(true);
      expect(savedPayload().linked_results).toEqual([9053]);
    });

    it('sends a "No" the user just selected, instead of the "Yes" still stored on the server', () => {
      component.innovationUseInfoBody.has_innovation_link = false;
      component.innovationUseInfoBody.linked_results = [];

      component.onSaveSection();

      expect(savedPayload().has_innovation_link).toBe(false);
      expect(savedPayload().linked_results).toEqual([]);
    });

    it('KEEPS the P2-3199 re-read for a 2025-phase result, whose answer still lives in section 2', () => {
      currentResultSignal.set({ portfolio: 'P25', result_type_id: 2, phase_year: 2025 });
      component.innovationUseInfoBody.has_innovation_link = false;
      component.innovationUseInfoBody.linked_results = [];

      component.onSaveSection();

      expect(getCallsWhenPatched).toBe(1);
      expect(savedPayload().has_innovation_link).toBe(true);
      expect(savedPayload().linked_results).toEqual([7777]);
    });

    it('carries the links this select never showed into the payload (result 11164)', () => {
      // Without them the save is a silent delete: the server de-activates every active row whose id
      // is missing from `linked_results` (`linked-results.repository.ts:313-330`).
      component.innovationUseInfoBody.has_innovation_link = true;
      component.innovationUseInfoBody.linked_results = ['8738', '8826', '8877'] as any;

      component.linkedInnovationId = 9053;
      component.onSaveSection();

      expect(savedPayload().linked_results).toEqual([9053, 8826, 8877]);
    });

    it('falls back to the held values when that 2025 re-read fails', () => {
      currentResultSignal.set({ portfolio: 'P25', result_type_id: 2, phase_year: 2025 });
      getP25Spy.mockReturnValue(throwError(() => new Error('boom')));
      component.innovationUseInfoBody.has_innovation_link = true;
      component.innovationUseInfoBody.linked_results = [{ id: '9' }] as any;

      component.onSaveSection();

      expect(savedPayload().has_innovation_link).toBe(true);
      expect(savedPayload().linked_results).toEqual([9]);
    });
  });

  /**
   * Template facts, read as text. A DOM assertion is not available here: the requiredness of these
   * controls is decided by the inputs this template passes, and both `app-pr-radio-button` and
   * `app-pr-select` default `required` to TRUE — the scan
   * (`DataControlService.someMandatoryFieldIncompleteResultDetail`) reads the `.pr-field.mandatory`
   * class those components emit from it. Removing the two `[required]="false"` bindings, or adding an
   * `appFeedbackValidation` marker, is exactly how this field would become mandatory again.
   */
  describe('the field is NOT mandatory', () => {
    /**
     * Comments stripped first. A guard that reads the raw file passes (or fails) on prose that merely
     * NAMES the thing it watches — the sibling guard in `innovation-link-surfaces.spec.ts` documents
     * that exact false positive, and the comment above this block names `appFeedbackValidation`.
     */
    const template = readFileSync(join(__dirname, 'innovation-use-info.component.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const tagsFor = (testid: string) => [...template.matchAll(new RegExp(`<app-pr-[a-z-]+\\b[^>]*data-testid="${testid}"[^>]*>`, 'g'))].map(m => m[0]);

    it('strips comments but keeps the markup — the guard reads real bindings, not prose', () => {
      expect(template).not.toContain('<!--');
      expect(template).toContain('<app-pr-radio-button');
    });

    it.each([['iu-field-has_innovation_link'], ['iu-field-linked_results']])('%s declares [required]="false"', testid => {
      const tags = tagsFor(testid);
      expect(tags).toHaveLength(1);
      expect(tags[0]).toContain('[required]="false"');
      expect(tags[0]).not.toContain('[required]="true"');
      // A `fieldRef` would let FieldsManagerService overwrite `required` behind this decision.
      expect(tags[0]).not.toContain('fieldRef');
    });

    it('adds no appFeedbackValidation marker — the other emitter of a scannable mandatory field', () => {
      expect(template).not.toContain('appFeedbackValidation');
    });
  });
});
