import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationItemComponent } from './notification-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { of, throwError } from 'rxjs';
import { FormatTimeAgoPipe } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';
// Leader addition (CRD-T-4 rework, attempt 2): resolved to `tests/mocks/spartanBrainMock.ts` via
// the `@spartan-ng/brain/(.*)` Jest module mapper. The stub's `disabled` is a plain `@Input()` with
// no host binding onto the native DOM attribute, so the Clear mapping "disabled while busy" case is
// asserted through this directive instance rather than `button.disabled` — see the test below.
import { BrnButton } from '@spartan-ng/brain/button';
// NOTIF-T-7: real Helm badge directive so the decision-chip rendering assertions exercise the
// actual component, not just an inert attribute (NO_ERRORS_SCHEMA below is only for the many
// unrelated custom elements — app-pr-button, app-cp-multiple-wps, etc. — this template never
// rendered through TestBed before this task).
import { HlmBadgeImports } from '@spartan/badge';
// Leader addition (CRD-T-4 rework, attempt 2): real `HlmButton` so its `hostDirectives`-forwarded
// `BrnButton` actually attaches to the Clear mapping button under test (the mock BrnButton has no
// host binding onto the native `disabled` attribute, so the directive INSTANCE is what's asserted).
import { HlmButtonImports } from '@spartan/button';
import { CONTRIBUTION_REQUEST_DRAWER_COPY } from '../../../../../../../../internationalization/contribution-request-drawer.copy';
// CRD-T-4: the real drawer (its own Brain primitives run against the shared Jest Brain stub,
// tests/mocks/spartanBrainMock.ts, same as every other Brain-based overlay in this repo) so the
// decline confirm/cancel wiring tests below can drive its actual footer buttons.
import { ContributionRequestDrawerComponent } from '../contribution-request-drawer/contribution-request-drawer.component';

describe('NotificationItemComponent', () => {
  let component: NotificationItemComponent;
  let fixture: ComponentFixture<NotificationItemComponent>;
  let mockApiService: any;
  let mockRetrieveModalService: any;
  let mockShareRequestModalService: any;

  beforeEach(async () => {
    mockApiService = {
      dataControlSE: {
        currentResult: {
          title: '',
          submitter: '',
          result_level_id: 1,
          result_type: ''
        },
        currentResultSignal: signal({
          title: '',
          submitter: '',
          result_level_id: 1,
          result_type: ''
        }),
        reportingCurrentPhase: {
          phaseId: '30'
        },
        currentNotification: '',
        showShareRequest: false
      },
      alertsFe: {
        show: jest.fn()
      },
      rolesSE: {
        platformIsClosed: false
      },
      resultsSE: {
        currentResultId: 1,
        GET_TypeByResultLevel: () => of({}),
        PATCH_updateRequest: () => of({ response: {} })
      }
    };

    mockRetrieveModalService = {
      title: '',
      requester_initiative_id: 1
    };

    mockShareRequestModalService = {
      shareRequestBody: {
        initiative_id: 1,
        official_code: '',
        short_name: '',
        result_toc_results: [],
        planned_result: ''
      }
    };

    await TestBed.configureTestingModule({
      declarations: [NotificationItemComponent],
      imports: [HttpClientTestingModule, FormatTimeAgoPipe, CommonModule, ContributionRequestDrawerComponent, ...HlmBadgeImports, ...HlmButtonImports],
      providers: [
        {
          provide: ApiService,
          useValue: mockApiService
        },
        {
          provide: RetrieveModalService,
          useValue: mockRetrieveModalService
        },
        {
          provide: ShareRequestModalService,
          useValue: mockShareRequestModalService
        }
      ],
      // NOTIF-T-7: the template pulls in app-pr-button/app-cp-multiple-wps/app-pr-yes-or-not
      // (real components declared elsewhere in NotificationItemModule, not needed by these unit tests).
      // No pre-existing test here ever rendered the template — this schema only affects the NEW
      // rendering tests below; the existing method-level tests never call detectChanges().
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationItemComponent);
    component = fixture.componentInstance;
  });

  describe('mapAndAccept()', () => {
    it('should not map and accept notification when requesting is true', () => {
      component.requestingAccept = true;

      component.mapAndAccept({});

      expect(mockApiService.dataControlSE.currentResult.title).toBe('');
      expect(mockRetrieveModalService.title).toBe('');
      expect(mockApiService.resultsSE.currentResultId).toBe(1);
      expect(mockApiService.dataControlSE.currentResult.result_level_id).toBe(1);
      expect(mockApiService.dataControlSE.currentResult.result_type).toBe('');
      expect(mockApiService.dataControlSE.currentNotification).toBe('');
      expect(mockShareRequestModalService.shareRequestBody.initiative_id).toBe(1);
      expect(mockShareRequestModalService.shareRequestBody.official_code).toBe('');
      expect(mockShareRequestModalService.shareRequestBody.short_name).toBe('');
      expect(mockApiService.dataControlSE.showShareRequest).toBeFalsy();
    });

    it('should map and accept notification', () => {
      component.requestingAccept = false;
      component.api.rolesSE.platformIsClosed = false;

      const notification = {
        share_result_request_id: 2725,
        result_id: '7774',
        request_status_id: 1,
        requested_date: '2024-08-29T01:24:56.104Z',
        aprovaed_date: null,
        is_map_to_toc: true,
        obj_request_status: { request_status_id: 1, name: 'Pending' },
        obj_result: {
          result_code: '5618',
          title: 'Understanding behaviour change in relation to agroecological transition: A novel approach',
          status_id: '1',
          obj_version: { id: '30', phase_name: 'Reporting 2024', status: true },
          obj_result_type: { id: 7, name: 'Innovation development' },
          obj_result_level: { id: 4, name: 'Initiative output' },
          obj_results_toc_result: []
        },
        obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
        obj_approved_by: null,
        obj_owner_initiative: {
          id: 31,
          official_code: 'INIT-31',
          name: 'Transformational Agroecology across Food, Land, and Water systems'
        },
        obj_shared_inititiative: { id: 1, official_code: 'INIT-01', name: 'Accelerated Breeding' }
      };
      component.notification = notification;

      component.mapAndAccept(notification);

      expect(mockApiService.dataControlSE.currentResult.title).toBe(
        'Understanding behaviour change in relation to agroecological transition: A novel approach'
      );
      expect(mockApiService.dataControlSE.currentResult.submitter).toBe(
        'INIT-31 - Transformational Agroecology across Food, Land, and Water systems'
      );
      expect(mockApiService.resultsSE.currentResultId).toBe('7774');
      expect(mockApiService.dataControlSE.currentResult.result_level_id).toBe(4);
      expect(mockApiService.dataControlSE.currentResult.result_type).toBe('Innovation development');
      expect(mockApiService.dataControlSE.currentNotification).toBe(notification);
      expect(mockShareRequestModalService.shareRequestBody.initiative_id).toBe(1);
      expect(mockShareRequestModalService.shareRequestBody.official_code).toBe('INIT-01');
      expect(mockShareRequestModalService.shareRequestBody.short_name).toBe('Accelerated Breeding');
      expect(mockApiService.dataControlSE.showShareRequest).toBeTruthy();
    });

    it('should set submitter to approving_official_code - approving_short_name when approving_inititiative_id = owner_initiative_id', () => {
      component.requestingAccept = false;
      component.api.rolesSE.platformIsClosed = false;

      const notification = {
        share_result_request_id: 2725,
        result_id: '7774',
        request_status_id: 1,
        requested_date: '2024-08-29T01:24:56.104Z',
        aprovaed_date: null,
        is_map_to_toc: true,
        obj_request_status: { request_status_id: 1, name: 'Pending' },
        obj_result: {
          result_code: '5618',
          title: 'Understanding behaviour change in relation to agroecological transition: A novel approach',
          status_id: '1',
          obj_version: { id: '30', phase_name: 'Reporting 2024', status: true },
          obj_result_type: { id: 7, name: 'Innovation development' },
          obj_result_level: { id: 4, name: 'Initiative output' },
          obj_results_toc_result: []
        },
        obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
        obj_approved_by: null,
        obj_owner_initiative: {
          id: 31,
          official_code: 'INIT-31',
          name: 'Transformational Agroecology across Food, Land, and Water systems'
        },
        obj_shared_inititiative: { id: 1, official_code: 'INIT-01', name: 'Accelerated Breeding' }
      };

      component.notification = notification;

      component.mapAndAccept(notification);

      expect(mockApiService.dataControlSE.currentResult.submitter).toBe(
        'INIT-31 - Transformational Agroecology across Food, Land, and Water systems'
      );
    });
  });

  describe('isQAed()', () => {
    it('should return false if status_id is 2 and request_status_id is 1', () => {
      component.notification = {
        request_status_id: 1,
        obj_result: {
          status_id: '2'
        }
      };

      const result = component.isQAed;

      expect(result).toBeTruthy();
    });
  });

  describe('resultUrl()', () => {
    it('should generate the correct result URL for non-IPSR results', () => {
      const mockNotification = {
        obj_result: {
          result_code: 'resultCode',
          obj_version: {
            id: '1'
          },
          obj_result_type: {
            id: 7
          }
        }
      };

      const result = component.resultUrl(mockNotification);

      expect(result).toBe('/result/result-detail/resultCode/general-information?phase=1');
    });

    it('should generate the correct IPSR URL when obj_result_type.id is 10', () => {
      const mockNotification = {
        obj_result: {
          result_code: '1234',
          obj_version: {
            id: '30'
          },
          obj_result_type: {
            id: 10
          }
        }
      };

      const result = component.resultUrl(mockNotification);

      expect(result).toBe('/ipsr/detail/1234/general-information?phase=30');
    });
  });

  describe('acceptOrReject()', () => {
    it('should handle success PATCH_updateRequest when response is true', () => {
      component.requestingAccept = false;
      component.api.rolesSE.platformIsClosed = false;

      component.notification = {
        share_result_request_id: 2725,
        result_id: '7774',
        request_status_id: 1,
        requested_date: '2024-08-29T01:24:56.104Z',
        aprovaed_date: null,
        is_map_to_toc: true,
        obj_request_status: { request_status_id: 1, name: 'Pending' },
        obj_result: {
          result_code: '5618',
          title: 'Understanding behaviour change in relation to agroecological transition: A novel approach',
          status_id: '1',
          obj_version: { id: '30', phase_name: 'Reporting 2024', status: true },
          obj_result_type: { id: 7, name: 'Innovation development' },
          obj_result_level: { id: 4, name: 'Initiative output' },
          obj_results_toc_result: []
        },
        obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
        obj_approved_by: null,
        obj_owner_initiative: {
          id: 31,
          official_code: 'INIT-31',
          name: 'Transformational Agroecology across Food, Land, and Water systems'
        },
        obj_shared_inititiative: { id: 1, official_code: 'INIT-01', name: 'Accelerated Breeding' }
      };
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');
      const emitSpy = jest.spyOn(component.requestEvent, 'emit');

      component.acceptOrReject(true);

      expect(spy).toHaveBeenCalledWith({
        id: 'noti',
        title: 'Request successfully accepted',
        status: 'success'
      });
      expect(component.requestingAccept).toBeFalsy();
      expect(emitSpy).toHaveBeenCalled();
    });
    it('should handle success PATCH_updateRequest when response is false', () => {
      component.requestingReject = false;
      component.api.rolesSE.platformIsClosed = false;

      component.notification = {
        share_result_request_id: 2725,
        result_id: '7774',
        request_status_id: 1,
        requested_date: '2024-08-29T01:24:56.104Z',
        aprovaed_date: null,
        is_map_to_toc: true,
        obj_request_status: { request_status_id: 1, name: 'Pending' },
        obj_result: {
          result_code: '5618',
          title: 'Understanding behaviour change in relation to agroecological transition: A novel approach',
          status_id: '1',
          obj_version: { id: '30', phase_name: 'Reporting 2024', status: true },
          obj_result_type: { id: 7, name: 'Innovation development' },
          obj_result_level: { id: 4, name: 'Initiative output' },
          obj_results_toc_result: []
        },
        obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
        obj_approved_by: null,
        obj_owner_initiative: {
          id: 31,
          official_code: 'INIT-31',
          name: 'Transformational Agroecology across Food, Land, and Water systems'
        },
        obj_shared_inititiative: { id: 1, official_code: 'INIT-01', name: 'Accelerated Breeding' }
      };
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');
      const emitSpy = jest.spyOn(component.requestEvent, 'emit');

      component.acceptOrReject(false);

      expect(spy).toHaveBeenCalledWith({
        id: 'noti',
        title: 'Request successfully rejected',
        status: 'information'
      });
      expect(component.requestingReject).toBeFalsy();
      expect(emitSpy).toHaveBeenCalled();
    });
    it('should not call PATCH_updateRequest when rolesSE.platformIsClosed is true', () => {
      mockApiService.rolesSE.platformIsClosed = true;
      const spy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.acceptOrReject(true);

      expect(spy).not.toHaveBeenCalled();
    });
    it('should handle errors from PATCH_updateRequest correctly', async () => {
      component.requestingAccept = false;
      component.api.rolesSE.platformIsClosed = false;

      component.notification = {
        share_result_request_id: 2725,
        result_id: '7774',
        request_status_id: 1,
        requested_date: '2024-08-29T01:24:56.104Z',
        aprovaed_date: null,
        is_map_to_toc: true,
        obj_request_status: { request_status_id: 1, name: 'Pending' },
        obj_result: {
          result_code: '5618',
          title: 'Understanding behaviour change in relation to agroecological transition: A novel approach',
          status_id: '1',
          obj_version: { id: '30', phase_name: 'Reporting 2024', status: true },
          obj_result_type: { id: 7, name: 'Innovation development' },
          obj_result_level: { id: 4, name: 'Initiative output' },
          obj_results_toc_result: []
        },
        obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
        obj_approved_by: null,
        obj_owner_initiative: {
          id: 31,
          official_code: 'INIT-31',
          name: 'Transformational Agroecology across Food, Land, and Water systems'
        },
        obj_shared_inititiative: { id: 1, official_code: 'INIT-01', name: 'Accelerated Breeding' }
      };
      const errorMessage = 'error message';
      const spy = jest.spyOn(mockApiService.alertsFe, 'show');
      const spyPATCH_updateRequest = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest').mockReturnValue(throwError(() => errorMessage));
      const emitSpy = jest.spyOn(component.requestEvent, 'emit');

      component.acceptOrReject(true);

      expect(spy).toHaveBeenCalledWith({
        id: 'noti-error',
        title: 'Error when requesting',
        description: '',
        status: 'error'
      });
      expect(component.requestingAccept).toBeFalsy();
      expect(spyPATCH_updateRequest).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('tocReview getter (P2-3085)', () => {
    it('should return [] when toc_contribution_review is absent', () => {
      component.notification = { is_map_to_toc: true };
      expect(component.tocReview).toEqual([]);
    });

    it('should return [] when notification is null', () => {
      component.notification = null;
      expect(component.tocReview).toEqual([]);
    });

    it('should return the review entries when present', () => {
      const entry = {
        level: 'Output',
        outcome_label: 'HLO1.AOW1.IO1',
        outcome_statement: 'Statement text',
        indicator_typology: 'Number of knowledge products',
        unit_of_measurement: 'Number',
        target: 6,
        contribution_target: 2
      };
      component.notification = { is_map_to_toc: true, toc_contribution_review: [entry] };
      expect(component.tocReview.length).toBe(1);
      expect(component.tocReview[0].outcome_label).toBe('HLO1.AOW1.IO1');
      expect(component.tocReview[0].contribution_target).toBe(2);
    });
  });

  // P2-3204: the backend sends the TOC type name as `statement` and the internal sentinel as
  // `indicator_typology`. The panel must show the name, matching Contributors & Partners.
  describe('tocTypologyOf() (P2-3204)', () => {
    it('should show the sentinel and the TOC type name together', () => {
      const review = {
        statement: '# partners supporting changes to more gender-equitable norms',
        indicator_typology: 'custom'
      };
      expect(component.tocTypologyOf(review)).toBe('custom — # partners supporting changes to more gender-equitable norms');
    });

    it('should not repeat the value when both fields are identical', () => {
      expect(component.tocTypologyOf({ statement: 'Innovation Use', indicator_typology: 'Innovation Use' })).toBe('Innovation Use');
    });

    it('should fall back to indicator_typology when statement is missing', () => {
      expect(component.tocTypologyOf({ indicator_typology: 'Innovation Use' })).toBe('Innovation Use');
    });

    it('should fall back to indicator_typology when statement is blank', () => {
      expect(component.tocTypologyOf({ statement: '   ', indicator_typology: 'Innovation Use' })).toBe('Innovation Use');
    });

    it('should show the em dash placeholder when neither field is populated', () => {
      expect(component.tocTypologyOf({})).toBe('—');
      expect(component.tocTypologyOf({ statement: '', indicator_typology: '' })).toBe('—');
    });

    it('should not break when the review entry is null', () => {
      expect(component.tocTypologyOf(null as any)).toBe('—');
    });
  });

  // P2-3187: accepting a bilateral contribution request must record the decision on the first click,
  // with no ToC information required, and then offer the ToC mapping as an optional follow-up step.
  // The existing suite only ever used `is_map_to_toc: true` fixtures and never set `source_name`, so
  // the branch changed here was completely uncovered.
  describe('P2-3187 — bilateral accept without ToC', () => {
    /**
     * Mirrors the live shape measured on prtest: every pending `W3/Bilaterals` request has
     * `is_map_to_toc: false`. `obj_version.id` matches the mocked reporting phase so
     * `invalidateRequest()` stays false.
     */
    const buildNotification = (overrides: any = {}) => ({
      share_result_request_id: 3187,
      result_id: '7774',
      request_status_id: 1,
      requested_date: '2026-08-20T01:24:56.104Z',
      aprovaed_date: null,
      is_map_to_toc: false,
      obj_request_status: { request_status_id: 1, name: 'Pending' },
      obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
      obj_approved_by: null,
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: '5618',
        title: 'A centre-reported bilateral result',
        status_id: '1',
        source_name: 'W3/Bilaterals',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P25' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        obj_results_toc_result: [],
        ...(overrides.obj_result ?? {})
      }
    });

    beforeEach(() => {
      mockApiService.rolesSE.platformIsClosed = false;
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.showShareRequest = false;
      component.requestingAccept = false;
      component.requestingReject = false;
    });

    // CRD-T-7 (pivot, CRD-DD-10): row Accept on a bilateral request opens the "Map to your Theory
    // of Change?" prompt again, restored verbatim from HEAD — the drawer (`openDrawer('align')`,
    // opened only from the row body) is a SEPARATE flow, never opened by the row Accept button.
    it('opens the optional ToC prompt — never the legacy mapping modal or the drawer — for a bilateral request (AC1/AC4, CRD-R-10 amended)', () => {
      component.notification = buildNotification();
      const acceptSpy = jest.spyOn(component, 'acceptOrReject');
      const mapSpy = jest.spyOn(component, 'mapAndAccept');

      component.onAcceptContribution();

      expect(component.showTocPromptDialog()).toBe(true);
      expect(component.drawerOpen()).toBe(false);
      expect(acceptSpy).not.toHaveBeenCalled();
      expect(mapSpy).not.toHaveBeenCalled();
      expect(mockApiService.dataControlSE.showShareRequest).toBeFalsy();
      expect(component.acceptsWithoutToc).toBe(true);
    });

    it('"Not now" records the plain accept with the inert ToC payload (AC1/AC3/AC5)', () => {
      component.notification = buildNotification();
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.onAcceptContribution();
      component.acceptOrReject(true);

      expect(patchSpy).toHaveBeenCalledTimes(1);
      const body = patchSpy.mock.calls[0][0];
      expect(body.request_status_id).toBe(2);
      expect(body.result_toc_result).toEqual({ planned_result: null, result_toc_results: [] });
      expect(component.showTocPromptDialog()).toBe(false);
    });

    it('"Map it" swaps the prompt for the mapping step, seeded with the CONTRIBUTOR initiative (AC4)', () => {
      component.notification = buildNotification();

      component.onAcceptContribution();
      component.openTocMappingStep();

      expect(component.showTocPromptDialog()).toBe(false);
      expect(component.showTocMappingDialog()).toBe(true);
      expect(component.tocInitiative.initiative_id).toBe(77);
      expect(component.tocInitiative.official_code).toBe('INIT-77');
      expect(component.tocInitiative.planned_result).toBeNull();
      expect(component.tocInitiative.result_toc_results).toHaveLength(1);
      expect(component.tocInitiative.result_toc_results[0].initiative_id).toBe(77);
      expect(component.tocInitiative.result_toc_results[0].results_id).toBe('7774');
      // The shared widget resolves the result id from the hydrated notification. CRD-T-7 (pivot):
      // unlike the drawer path, the popup path hydrates immediately on open (CRD-DD-10).
      expect(mockApiService.dataControlSE.currentNotification).toBe(component.notification);
      // The step lives in this card: the legacy app-level modal is never opened.
      expect(mockApiService.dataControlSE.showShareRequest).toBeFalsy();
    });

    it('"Accept with mapping" sends ONE PATCH carrying the mapping for the contributor (AC4/AC6)', () => {
      component.notification = buildNotification();
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.openTocMappingStep();
      component.tocInitiative.planned_result = true;
      Object.assign(component.tocInitiative.result_toc_results[0], {
        toc_level_id: 1,
        toc_result_id: 901,
        indicators: [{ related_node_id: 55, toc_results_indicator_id: 42, targets: [{ contributing_indicator: 3 }] }]
      });

      component.acceptOrReject(true, true);

      expect(patchSpy).toHaveBeenCalledTimes(1);
      const body = patchSpy.mock.calls[0][0];
      expect(body.request_status_id).toBe(2);
      expect(body.result_toc_result.planned_result).toBe(true);
      expect(body.result_toc_result.result_toc_results).toHaveLength(1);
      const tab = body.result_toc_result.result_toc_results[0];
      expect(tab.initiative_id).toBe(77);
      expect(tab.official_code).toBe('INIT-77');
      expect(tab.results_id).toBe('7774');
      expect(tab.toc_result_id).toBe(901);
      expect(tab.toc_level_id).toBe(1);
      expect(tab.indicators).toHaveLength(1);
    });

    it('gates "Accept with mapping" on a complete mapping, mirroring the review drawer rule (AC4)', () => {
      component.notification = buildNotification();
      component.openTocMappingStep();

      expect(component.isTocMappingComplete()).toBe(false);

      component.tocInitiative.planned_result = true;
      expect(component.isTocMappingComplete()).toBe(false);

      Object.assign(component.tocInitiative.result_toc_results[0], { toc_level_id: 1, toc_result_id: 901 });
      // Planned results also demand the indicator, exactly like validateIsToCCompleted in the drawer.
      expect(component.isTocMappingComplete()).toBe(false);

      component.tocInitiative.result_toc_results[0].indicators[0].toc_results_indicator_id = 42;
      expect(component.isTocMappingComplete()).toBe(true);

      // Unplanned mappings do not require the indicator.
      component.tocInitiative.planned_result = false;
      component.tocInitiative.result_toc_results[0].indicators[0].toc_results_indicator_id = null;
      expect(component.isTocMappingComplete()).toBe(true);
    });

    it('routes the decision by the request portfolio, not by session state (P2-3188 parity)', () => {
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.notification = buildNotification();
      component.acceptOrReject(true);
      expect(patchSpy).toHaveBeenLastCalledWith(expect.anything(), true);

      component.notification = buildNotification({ obj_result: { obj_version: { id: '30', obj_portfolio: { acronym: 'P22' } } } });
      component.acceptOrReject(false);
      expect(patchSpy).toHaveBeenLastCalledWith(expect.anything(), false);
    });

    it('closing either dialog records nothing — the request stays pending', () => {
      component.notification = buildNotification();
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.onAcceptContribution();
      component.showTocPromptDialog.set(false);
      component.openTocMappingStep();
      component.showTocMappingDialog.set(false);

      expect(patchSpy).not.toHaveBeenCalled();
    });

    it('should keep the legacy modal-first flow for a non-bilateral request with is_map_to_toc false', () => {
      const notification = buildNotification({ obj_result: { source_name: 'W1/W2' } });
      component.notification = notification;
      const acceptSpy = jest.spyOn(component, 'acceptOrReject');
      const mapSpy = jest.spyOn(component, 'mapAndAccept').mockImplementation(() => null);

      component.onAcceptContribution();

      expect(mapSpy).toHaveBeenCalledWith(notification);
      expect(acceptSpy).not.toHaveBeenCalled();
      expect(component.acceptsWithoutToc).toBe(false);
    });

    it('should accept directly when is_map_to_toc is true, for both source_name values', () => {
      for (const source_name of ['W3/Bilaterals', 'W1/W2']) {
        component.notification = buildNotification({ is_map_to_toc: true, obj_result: { source_name } });
        const acceptSpy = jest.spyOn(component, 'acceptOrReject').mockImplementation(() => undefined);
        const mapSpy = jest.spyOn(component, 'mapAndAccept').mockImplementation(() => null);

        component.onAcceptContribution();

        expect(acceptSpy).toHaveBeenCalledWith(true);
        expect(mapSpy).not.toHaveBeenCalled();
        acceptSpy.mockRestore();
        mapSpy.mockRestore();
      }
    });

    it('should send an inert result_toc_result and request_status_id 2 when accepting (AC3/AC6)', () => {
      component.notification = buildNotification();
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.acceptOrReject(true);

      expect(patchSpy).toHaveBeenCalledTimes(1);
      const body = patchSpy.mock.calls[0][0];
      expect(body.request_status_id).toBe(2);
      expect(body.result_toc_result).toEqual({ planned_result: null, result_toc_results: [] });
      expect(body.result_request).toBe(component.notification);
    });

    it('should send request_status_id 3 and the same inert result_toc_result when declining (AC2/AC6)', () => {
      component.notification = buildNotification();
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.acceptOrReject(false);

      expect(patchSpy).toHaveBeenCalledTimes(1);
      const body = patchSpy.mock.calls[0][0];
      expect(body.request_status_id).toBe(3);
      expect(body.result_toc_result).toEqual({ planned_result: null, result_toc_results: [] });
    });

    /**
     * AC4 is built (Option A, 2026-09-04), but the OLD lock still matters: the optional step must
     * never be `<app-share-request-modal>`. Reopening it after an accept is a triple trap — its ToC
     * control is `[hidden]` for bilateral (P2-2498), completing it fires a SECOND
     * `request_status_id: 2` PATCH, and answering "Yes" dead-ends on `validateAcceptOrReject`. The
     * mapping step lives in THIS card (CRD-T-7 pivot, restored from HEAD) and rides the same single
     * PATCH; this test keeps it that way.
     */
    it('never opens the legacy share-request modal — the AC4 step is in-card and single-PATCH', () => {
      component.notification = buildNotification();

      component.onAcceptContribution();
      component.openTocMappingStep();
      component.acceptOrReject(true, true);

      expect(mockApiService.dataControlSE.showShareRequest).toBeFalsy();
    });

    it('reports the accept failure and opens nothing when the PATCH errors', () => {
      component.notification = buildNotification();
      jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest').mockReturnValue(throwError(() => 'boom'));
      const alertSpy = jest.spyOn(mockApiService.alertsFe, 'show');

      component.acceptOrReject(true);

      expect(mockApiService.dataControlSE.showShareRequest).toBeFalsy();
      expect(alertSpy).toHaveBeenCalledWith({ id: 'noti-error', title: 'Error when requesting', description: '', status: 'error' });
    });

    it('should still block a bilateral accept when the platform is closed', () => {
      component.notification = buildNotification();
      mockApiService.rolesSE.platformIsClosed = true;
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.onAcceptContribution();

      expect(patchSpy).not.toHaveBeenCalled();
      expect(mockApiService.dataControlSE.showShareRequest).toBeFalsy();
    });

    it('should still block a bilateral accept outside the open reporting phase for a non-admin', () => {
      component.notification = buildNotification({ obj_result: { obj_version: { id: '34' }, status_id: 6 } });
      const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

      component.onAcceptContribution();

      expect(component.invalidateRequest()).toBe(true);
      expect(patchSpy).not.toHaveBeenCalled();
      expect(mockApiService.dataControlSE.showShareRequest).toBeFalsy();
    });
  });

  // NOTIF-T-7: row restyle + decision chip. Template/CSS only — the .ts is untouched (proven by
  // every pre-existing test above still passing unmodified). These are the FIRST tests in this
  // file that ever render the template (fixture.detectChanges()).
  describe('NOTIF-T-7 — row restyle + decision chip (template)', () => {
    const buildRenderableNotification = (overrides: any = {}) => ({
      share_result_request_id: 4001,
      result_id: '9001',
      requested_date: '2026-09-20T10:00:00.000Z',
      aprovaed_date: '2026-09-21T10:00:00.000Z',
      is_map_to_toc: true,
      obj_requested_by: { id: 1, first_name: 'Jane', last_name: 'Doe' },
      obj_approved_by: { id: 2, first_name: 'Jane', last_name: 'Approver' },
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: 'RC-9001',
        title: 'A reported result',
        status_id: '1',
        source_name: 'W1/W2',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P25' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        obj_results_toc_result: [],
        ...(overrides.obj_result ?? {})
      }
    });

    beforeEach(() => {
      mockApiService.rolesSE.platformIsClosed = false;
      mockApiService.rolesSE.isAdmin = false;
      component.requestingAccept = false;
      component.requestingReject = false;
      component.isSent = false;
    });

    it('renders both the existing "Accepted by …" text and the new decision chip for request_status_id 2', () => {
      component.notification = buildRenderableNotification({ request_status_id: 2 });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      expect(root.textContent).toContain('Accepted');
      expect(root.textContent).toContain('by Jane Approver');

      const chip = root.querySelector('[data-notif-decision-chip="accepted"]');
      expect(chip).toBeTruthy();
      expect(chip?.textContent?.trim()).toBe('Accepted');
      expect(chip?.className).toContain('notification_decision_chip_accepted');
    });

    it('renders both the existing "Rejected by …" text and the new decision chip for request_status_id 3', () => {
      component.notification = buildRenderableNotification({ request_status_id: 3 });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      expect(root.textContent).toContain('Rejected');
      expect(root.textContent).toContain('by Jane Approver');

      const chip = root.querySelector('[data-notif-decision-chip="declined"]');
      expect(chip).toBeTruthy();
      expect(chip?.textContent?.trim()).toBe('Declined');
      expect(chip?.className).toContain('notification_decision_chip_declined');
    });

    it('renders no decision chip for a pending (request_status_id 1) row', () => {
      component.notification = buildRenderableNotification({ request_status_id: 1 });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      expect(root.querySelector('[data-notif-decision-chip]')).toBeNull();
    });

    // NOTIF-T-10 (supersedes NOTIF-T-7's assertion): the row was restructured into ONE flat flex row
    // per the user's updated reference file — avatar/icon is now a DIRECT child of `.notification_content`
    // (the row shell itself), sitting BEFORE the text column (`.notification_content_body`, which now
    // holds only the text/caption, not the avatar). Old assertion ("avatar's parent is
    // .notification_content_body") no longer holds by design; this checks the new structural fact:
    // the row shell (`.notification_content`) is a flex row (jsdom-safe: computed via the SCSS class
    // list membership, not a real layout computation) and the avatar is its first element child.
    it('places the avatar as the first child of the .notification_content row shell (NOTIF-T-10)', () => {
      component.notification = buildRenderableNotification({ request_status_id: 2 });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const avatar = root.querySelector('.notification_avatar');
      expect(avatar).toBeTruthy();

      const rowShell = avatar?.parentElement;
      expect(rowShell?.classList.contains('notification_content')).toBe(true);
      expect(rowShell?.firstElementChild).toBe(avatar);

      // The old header chip row is gone entirely (NOTIF-T-10).
      expect(root.querySelector('.notification_header')).toBeFalsy();
      expect(root.querySelector('.notification_header_item')).toBeFalsy();
    });

    // NOTIF-T-10: the decided-state caption moved from a separate right-side actions column into the
    // text column, directly below the main sentence — assert the new location instead of the old one.
    it('renders the decided-state caption inside the text column, below the main sentence (NOTIF-T-10)', () => {
      component.notification = buildRenderableNotification({ request_status_id: 2 });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const body = root.querySelector('.notification_content_body');
      expect(body).toBeTruthy();

      const caption = body?.querySelector('.notification_content_caption');
      expect(caption).toBeTruthy();
      expect(caption?.textContent).toContain('Accepted by Jane Approver');

      const mainText = body?.querySelector('.notification_content_body_text');
      expect(mainText).toBeTruthy();
      // Caption must come after the main sentence within the same column.
      expect(mainText?.compareDocumentPosition(caption!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    // CRD-T-7 (pivot, CRD-DD-10): row Accept still opens `showTocPromptDialog`, unchanged from
    // `HEAD` — restored after the CRD-T-4 drawer-only interlude (the row body, not this button,
    // opens the drawer).
    it('clicking Accept contribution on a pending bilateral fixture still opens showTocPromptDialog, unchanged (.ts untouched)', () => {
      component.notification = buildRenderableNotification({
        request_status_id: 1,
        is_map_to_toc: false,
        obj_result: { source_name: 'W3/Bilaterals' }
      });
      fixture.detectChanges();

      const acceptBtn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="accept-contribution-btn"]');
      expect(acceptBtn).toBeTruthy();

      acceptBtn.dispatchEvent(new Event('click'));

      expect(component.showTocPromptDialog()).toBe(true);
      expect(component.drawerOpen()).toBe(false);
    });
  });

  // NOTIF-T-9 (POST-PASS defect fix on NOTIF-T-6/NOTIF-T-7): individual-requester rows show initials
  // in a circle; bilateral/entity rows show an icon in a rounded square. Template/CSS only, `.ts`
  // untouched — same discipline as NOTIF-T-7 above.
  describe('NOTIF-T-9 — avatar defect fixes (initials + rounded-square icon)', () => {
    const buildRenderableNotification = (overrides: any = {}) => ({
      share_result_request_id: 4001,
      result_id: '9001',
      requested_date: '2026-09-20T10:00:00.000Z',
      aprovaed_date: '2026-09-21T10:00:00.000Z',
      is_map_to_toc: true,
      obj_requested_by: { id: 1, first_name: 'Samuel', last_name: 'Otieno' },
      obj_approved_by: { id: 2, first_name: 'Jane', last_name: 'Approver' },
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: 'RC-9001',
        title: 'A reported result',
        status_id: '1',
        source_name: 'W1/W2',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P25' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        obj_results_toc_result: [],
        ...(overrides.obj_result ?? {})
      }
    });

    beforeEach(() => {
      mockApiService.rolesSE.platformIsClosed = false;
      mockApiService.rolesSE.isAdmin = false;
      component.requestingAccept = false;
      component.requestingReject = false;
      component.isSent = false;
    });

    it('renders the requester initials, uppercased, inside a circle avatar for an individual (non-bilateral) row', () => {
      component.notification = buildRenderableNotification({ request_status_id: 1, obj_result: { source_name: 'W1/W2' } });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const avatar = root.querySelector('.notification_avatar');
      expect(avatar).toBeTruthy();
      expect(avatar?.classList.contains('notification_avatar_bilateral')).toBe(false);

      const initials = avatar?.querySelector('.notification_avatar_initials');
      expect(initials).toBeTruthy();
      expect(initials?.textContent?.trim()).toBe('SO');
      expect(avatar?.querySelector('i.pi')).toBeFalsy();
    });

    it('renders an icon inside a rounded-square (bilateral) avatar for a W3/Bilaterals row, never initials', () => {
      component.notification = buildRenderableNotification({ request_status_id: 1, obj_result: { source_name: 'W3/Bilaterals' } });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const avatar = root.querySelector('.notification_avatar');
      expect(avatar).toBeTruthy();
      expect(avatar?.classList.contains('notification_avatar_bilateral')).toBe(true);

      expect(avatar?.querySelector('i.pi.pi-building')).toBeTruthy();
      expect(avatar?.querySelector('.notification_avatar_initials')).toBeFalsy();
    });

    it('falls back to an empty-string initial per missing name part, never rendering "undefined"/"null"', () => {
      component.notification = buildRenderableNotification({
        request_status_id: 1,
        obj_result: { source_name: 'W1/W2' },
        obj_requested_by: { id: 1, first_name: '', last_name: undefined }
      });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const initials = root.querySelector('.notification_avatar_initials');
      expect(initials?.textContent?.trim()).toBe('');
    });
  });

  // CRD-T-3/T-4: drawer state and decision logic for the contribution request drawer
  // (docs/specs/changes/contribution-request-drawer/). CRD-T-7 (pivot, CRD-DD-10) restored the row's
  // three popups and their signals (`showConfirmRejectDialog`, `showTocPromptDialog`,
  // `showTocMappingDialog`, `openTocMappingStep()`) alongside the drawer — everything below still
  // drives the drawer's own members, exercised through the drawer's entry points directly. This
  // block is CRD-TEST-3.
  describe('CRD — drawer logic', () => {
    const buildBilateral = (overrides: any = {}) => ({
      share_result_request_id: 5001,
      result_id: '7774',
      request_status_id: 1,
      requested_date: '2026-09-25T01:24:56.104Z',
      aprovaed_date: null,
      is_map_to_toc: false,
      obj_request_status: { request_status_id: 1, name: 'Pending' },
      obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
      obj_approved_by: null,
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: '5618',
        title: 'A centre-reported bilateral result',
        status_id: '1',
        source_name: 'W3/Bilaterals',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P25' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        obj_results_toc_result: [],
        ...(overrides.obj_result ?? {})
      }
    });

    const buildTocCarried = (overrides: any = {}) => ({
      share_result_request_id: 5002,
      result_id: '7775',
      request_status_id: 1,
      requested_date: '2026-09-25T01:24:56.104Z',
      is_map_to_toc: true,
      obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: '9377',
        title: 'A ToC-carried result',
        status_id: '1',
        source_name: 'W1/W2',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P22' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        ...(overrides.obj_result ?? {})
      }
    });

    const buildLegacy = (overrides: any = {}) => ({
      share_result_request_id: 5003,
      result_id: '7776',
      request_status_id: 1,
      requested_date: '2026-09-25T01:24:56.104Z',
      is_map_to_toc: false,
      obj_requested_by: { id: 307, first_name: 'John', last_name: 'Doe' },
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: '1234',
        title: 'A legacy result',
        status_id: '1',
        source_name: 'W1/W2',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P22' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        ...(overrides.obj_result ?? {})
      }
    });

    const completeMapping = () => {
      component.tocInitiative.planned_result = true;
      Object.assign(component.tocInitiative.result_toc_results[0], {
        toc_level_id: 1,
        toc_result_id: 901,
        indicators: [{ related_node_id: 55, toc_results_indicator_id: 42, targets: [{ contributing_indicator: 3 }] }]
      });
    };

    beforeEach(() => {
      mockApiService.rolesSE.platformIsClosed = false;
      mockApiService.rolesSE.isAdmin = false;
      mockApiService.dataControlSE.showShareRequest = false;
      component.requestingAccept = false;
      component.requestingReject = false;
      component.isSent = false;
    });

    describe('openDrawer() / closeDrawer()', () => {
      it('seeds an untouched tocInitiative locally, with NO global hydration, for a bilateral request', () => {
        component.notification = buildBilateral();
        const hydrateSpy = jest.spyOn(component as any, 'hydrateGlobalTocState');

        component.openDrawer('details');

        expect(component.drawerOpen()).toBe(true);
        expect(component.tocInitiative.initiative_id).toBe(77);
        expect(component.tocInitiative.planned_result).toBeNull();
        expect(component.isTocMappingTouched()).toBe(false);
        expect(hydrateSpy).not.toHaveBeenCalled();
      });

      it('does not seed a tocInitiative for a non-bilateral request', () => {
        component.notification = buildTocCarried();

        component.openDrawer('details');

        expect(component.tocInitiative).toBeNull();
      });

      it('sets mode "confirm-decline" and no Align focus for entry "confirm-decline"', () => {
        component.notification = buildBilateral();

        component.openDrawer('confirm-decline');

        expect(component.drawerMode()).toBe('confirm-decline');
        expect(component.drawerFocusAlign()).toBe(false);
      });

      it('sets Align focus for entry "align", decide mode otherwise', () => {
        component.notification = buildBilateral();

        component.openDrawer('align');

        expect(component.drawerMode()).toBe('decide');
        expect(component.drawerFocusAlign()).toBe(true);
      });

      it('closeDrawer() discards the mapping and sends no PATCH (CRD-R-9)', () => {
        component.notification = buildBilateral();
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');
        component.openDrawer('align');
        component.tocInitiative.planned_result = true;

        component.closeDrawer();

        expect(component.drawerOpen()).toBe(false);
        expect(component.drawerMode()).toBe('decide');
        expect(component.drawerFocusAlign()).toBe(false);
        expect(component.tocInitiative).toBeNull();
        expect(patchSpy).not.toHaveBeenCalled();
      });
    });

    describe('onDrawerAccept() — the CRD-R-6 decision table', () => {
      it('ToC-carried: one PATCH, status 2, inert payload', () => {
        component.notification = buildTocCarried();
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

        component.onDrawerAccept();

        expect(patchSpy).toHaveBeenCalledTimes(1);
        const body = patchSpy.mock.calls[0][0];
        expect(body.request_status_id).toBe(2);
        expect(body.result_toc_result).toEqual({ planned_result: null, result_toc_results: [] });
      });

      // Falsifier: an untouched bilateral onDrawerAccept() sends a payload other than the inert one,
      // or sends 2 calls.
      it('Bilateral untouched: exactly one PATCH with the inert payload, status 2', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

        component.onDrawerAccept();

        expect(patchSpy).toHaveBeenCalledTimes(1);
        const body = patchSpy.mock.calls[0][0];
        expect(body.request_status_id).toBe(2);
        expect(body.result_toc_result).toEqual({ planned_result: null, result_toc_results: [] });
      });

      // Falsifier: a complete mapping sends tabs whose initiative_id is the owner's, not the contributor's.
      it('Bilateral complete: one PATCH carrying the mapping for the CONTRIBUTOR initiative (77), never the owner (31)', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');
        completeMapping();
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

        component.onDrawerAccept();

        expect(patchSpy).toHaveBeenCalledTimes(1);
        const body = patchSpy.mock.calls[0][0];
        expect(body.request_status_id).toBe(2);
        expect(body.result_toc_result.planned_result).toBe(true);
        const tab = body.result_toc_result.result_toc_results[0];
        expect(tab.initiative_id).toBe(77);
        expect(tab.initiative_id).not.toBe(31);
      });

      // Falsifier: onDrawerAccept() with planned_result = true and no toc_result_id calls the PATCH at all.
      it('Bilateral touched and incomplete: no PATCH is sent', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');
        component.tocInitiative.planned_result = true;
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

        component.onDrawerAccept();

        expect(patchSpy).not.toHaveBeenCalled();
      });

      it('stays possible to accept after Clear mapping on an incomplete mapping (AC3/AC5 escape hatch)', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');
        component.tocInitiative.planned_result = true;
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

        component.clearTocMapping();
        component.onDrawerAccept();

        expect(patchSpy).toHaveBeenCalledTimes(1);
        const body = patchSpy.mock.calls[0][0];
        expect(body.result_toc_result).toEqual({ planned_result: null, result_toc_results: [] });
      });

      // Falsifier: the legacy branch sets dataControlSE.showShareRequest = true while drawerOpen()
      // is still true (call-order spies, CRD-DD-6).
      it('Legacy: closeDrawer() runs BEFORE showShareRequest is set, drawer closed then modal opens', () => {
        component.notification = buildLegacy();
        component.openDrawer('details');
        const calls: string[] = [];
        jest.spyOn(component, 'closeDrawer').mockImplementation(() => {
          calls.push('closeDrawer');
          NotificationItemComponent.prototype.closeDrawer.call(component);
        });
        Object.defineProperty(mockApiService.dataControlSE, 'showShareRequest', {
          configurable: true,
          get: () => (mockApiService.dataControlSE as any)._showShareRequest,
          set: (v: boolean) => {
            if (v) calls.push('showShareRequest');
            (mockApiService.dataControlSE as any)._showShareRequest = v;
          }
        });

        component.onDrawerAccept();

        expect(calls).toEqual(['closeDrawer', 'showShareRequest']);
        expect(component.drawerOpen()).toBe(false);
      });

      // Falsifier: isP25 arg ≠ request portfolio.
      it('routes the PATCH isP25 arg by the request portfolio, not session state (P2-3188 parity)', () => {
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

        component.notification = buildTocCarried({ obj_result: { obj_version: { id: '30', obj_portfolio: { acronym: 'P25' } } } });
        component.onDrawerAccept();
        expect(patchSpy).toHaveBeenLastCalledWith(expect.anything(), true);

        component.notification = buildTocCarried({ obj_result: { obj_version: { id: '30', obj_portfolio: { acronym: 'P22' } } } });
        component.onDrawerAccept();
        expect(patchSpy).toHaveBeenLastCalledWith(expect.anything(), false);
      });
    });

    describe('acceptOrReject() finalize — CRD-R-8 "Outcome closes the drawer"', () => {
      it('on success, the drawer is closed BEFORE requestEvent.emit() (call order)', () => {
        component.notification = buildTocCarried();
        component.openDrawer('details');
        const calls: string[] = [];
        jest.spyOn(component, 'closeDrawer').mockImplementation(() => {
          calls.push('closeDrawer');
          NotificationItemComponent.prototype.closeDrawer.call(component);
        });
        jest.spyOn(component.requestEvent, 'emit').mockImplementation(() => calls.push('emit'));

        component.acceptOrReject(true);

        expect(calls).toEqual(['closeDrawer', 'emit']);
      });

      // Falsifier: on a PATCH error, requestEvent.emit runs while drawerOpen() is true.
      it('on error, drawerOpen() is already false by the time requestEvent.emit() runs', () => {
        component.notification = buildTocCarried();
        component.openDrawer('details');
        jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest').mockReturnValue(throwError(() => 'boom'));
        let drawerOpenAtEmit: boolean | null = null;
        jest.spyOn(component.requestEvent, 'emit').mockImplementation(() => {
          drawerOpenAtEmit = component.drawerOpen();
        });

        component.acceptOrReject(true);

        expect(drawerOpenAtEmit).toBe(false);
      });

      it('does not stay open after the refetch (instance reused under track $index, CRD-P-6)', () => {
        component.notification = buildTocCarried();
        component.openDrawer('details');

        component.acceptOrReject(true);

        expect(component.drawerOpen()).toBe(false);
      });
    });

    describe('onDrawerResult() — CRD-R-3', () => {
      it('non-bilateral: opens resultUrl() in a new tab, keeps the drawer open', () => {
        component.notification = buildTocCarried();
        component.openDrawer('details');
        const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

        component.onDrawerResult();

        expect(openSpy).toHaveBeenCalledWith(component.resultUrl(component.notification), '_blank');
        expect(component.drawerOpen()).toBe(true);
        openSpy.mockRestore();
      });

      it('bilateral: closes the drawer BEFORE navigateToResult (CRD-DD-6, no stacked drawers)', () => {
        component.notification = buildBilateral();
        component.openDrawer('details');
        const calls: string[] = [];
        jest.spyOn(component, 'closeDrawer').mockImplementation(() => {
          calls.push('closeDrawer');
          NotificationItemComponent.prototype.closeDrawer.call(component);
        });
        jest.spyOn(component, 'navigateToResult').mockImplementation(() => calls.push('navigateToResult') as any);

        component.onDrawerResult();

        expect(calls).toEqual(['closeDrawer', 'navigateToResult']);
      });
    });

    describe('onTocPlannedResultChange() — deferred hydration (CRD-DD-3)', () => {
      it('opening the drawer does NOT hydrate global ToC state for a bilateral request', () => {
        component.notification = buildBilateral();
        const hydrateSpy = jest.spyOn(component as any, 'hydrateGlobalTocState');

        component.openDrawer('align');

        expect(hydrateSpy).not.toHaveBeenCalled();
      });

      it('hydrates on the FIRST planned-result answer, and only once across repeated changes', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');
        const hydrateSpy = jest.spyOn(component as any, 'hydrateGlobalTocState');

        component.tocInitiative.planned_result = true;
        component.onTocPlannedResultChange();
        component.tocInitiative.planned_result = false;
        component.onTocPlannedResultChange();

        expect(hydrateSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('isPending / isTocMappingTouched()', () => {
      it('isPending is true only for a status-1 Received row', () => {
        component.notification = buildBilateral({ request_status_id: 1 });
        component.isSent = false;
        expect(component.isPending).toBe(true);

        component.notification = buildBilateral({ request_status_id: 2 });
        expect(component.isPending).toBe(false);

        component.notification = buildBilateral({ request_status_id: 1 });
        component.isSent = true;
        expect(component.isPending).toBe(false);
      });

      it('isTocMappingTouched() reflects whether the planned-result question was answered', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');
        expect(component.isTocMappingTouched()).toBe(false);

        component.tocInitiative.planned_result = false;
        expect(component.isTocMappingTouched()).toBe(true);
      });
    });

    describe('drawerHeader() — CRD-R-2', () => {
      it('non-bilateral: reuses the row requesterCode/responderCode resolution', () => {
        component.notification = buildTocCarried();

        const header = component.drawerHeader();

        expect(header.requesterCode).toBe(component.requesterCode);
        expect(header.responderCode).toBe(component.responderCode);
        expect(header.lead).toBe('John Doe');
        expect(header.resultCode).toBe('9377');
      });

      it('bilateral: names the reporting Center, invents no requester person name (CRD-T-4 forward pointer 5)', () => {
        component.notification = buildBilateral({
          obj_result: { result_center_array: [{ clarisa_center_object: { clarisa_institution: { acronym: 'CIAT' } } }] }
        });

        const header = component.drawerHeader();

        expect(header.lead).toBe('Center CIAT');
        expect(header.lead).not.toContain('John');
        expect(header.responderCode).toBe(component.responderCode);
        // Left empty on purpose: the CRD template omits "from X" entirely when this is falsy, so no
        // requester name (invented or otherwise) is ever rendered for a bilateral request.
        expect(header.requesterCode).toBe('');
      });
    });

    describe('drawerReviewTables() — CRD-R-4', () => {
      it('renders a single all-dash table of 7 fields when there is no review data', () => {
        component.notification = buildBilateral();

        const tables = component.drawerReviewTables();

        expect(tables).toHaveLength(1);
        expect(tables[0]).toHaveLength(7);
        expect(tables[0].every(field => field.value === CONTRIBUTION_REQUEST_DRAWER_COPY.dashValue)).toBe(true);
      });

      it('renders one table per entry, in server order, with real values', () => {
        component.notification = buildTocCarried({
          toc_contribution_review: [
            { level: 'Output', outcome_label: 'HLO1', target: 6, contribution_target: 2 },
            { level: 'Outcome', outcome_label: 'HLO2', target: 9, contribution_target: 4 }
          ]
        });

        const tables = component.drawerReviewTables();

        expect(tables).toHaveLength(2);
        expect(tables[0][0].value).toBe('Output');
        expect(tables[1][0].value).toBe('Outcome');
        expect(tables[0].find(f => f.label === 'Target')?.value).toBe('6');
        expect(tables[0].find(f => f.label === 'Target')?.mono).toBe(true);
      });
    });

    describe('drawerBlockedReason() / drawerAcceptHelper() — CRD-R-8/R-6', () => {
      it('is null while a PATCH is in flight (busy state, not blocked)', () => {
        component.notification = buildBilateral();
        component.requestingAccept = true;
        mockApiService.rolesSE.platformIsClosed = true;

        expect(component.drawerBlockedReason()).toBeNull();
      });

      it('shows the QA reason when QAed, the generic reason otherwise', () => {
        component.notification = buildBilateral({ obj_result: { status_id: 2 } });
        expect(component.drawerBlockedReason()).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.footer.blockedQAedReason);

        component.notification = buildBilateral();
        mockApiService.rolesSE.platformIsClosed = true;
        expect(component.drawerBlockedReason()).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.footer.blockedGenericReason);
      });

      it('shows the helper only when the mapping is touched and incomplete', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');
        expect(component.drawerAcceptHelper()).toBeNull();

        component.tocInitiative.planned_result = true;
        expect(component.drawerAcceptHelper()).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.footer.acceptHelperIncompleteMapping);

        completeMapping();
        expect(component.drawerAcceptHelper()).toBeNull();
      });
    });

    // CRD-T-4 forward pointer 2: the drawer's own confirm-decline footer, driven through the REAL
    // mounted `<app-contribution-request-drawer>` (not a stub), proving the wiring on
    // `(declineCancelled)`/`(declineConfirmed)`, not just the handlers in isolation.
    describe('Decline confirm/cancel — mounted drawer wiring (CRD-R-7)', () => {
      it('Cancel returns the drawer to decide mode and sends no PATCH', async () => {
        component.notification = buildTocCarried();
        component.openDrawer('confirm-decline');
        fixture.detectChanges();
        await fixture.whenStable();
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

        const cancelBtn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="crd-cancel-btn"]');
        expect(cancelBtn).toBeTruthy();
        cancelBtn.dispatchEvent(new Event('click'));

        expect(component.drawerMode()).toBe('decide');
        expect(patchSpy).not.toHaveBeenCalled();
      });

      it('Confirm decline sends exactly one PATCH with status 3', async () => {
        component.notification = buildTocCarried();
        component.openDrawer('confirm-decline');
        fixture.detectChanges();
        await fixture.whenStable();
        const patchSpy = jest.spyOn(mockApiService.resultsSE, 'PATCH_updateRequest');

        const confirmBtn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="crd-confirm-decline-btn"]');
        expect(confirmBtn).toBeTruthy();
        confirmBtn.dispatchEvent(new Event('click'));

        expect(patchSpy).toHaveBeenCalledTimes(1);
        expect(patchSpy.mock.calls[0][0].request_status_id).toBe(3);
      });
    });

    // CRD-T-4 forward pointer 4: the real BrnDialog's `closed` output also fires asynchronously
    // after a PROGRAMMATIC close (e.g. acceptOrReject's finalize). Under track $index instance
    // reuse a late, second `closed` must not wipe state — this proves the guard on the exact
    // scenario named: the drawer is already closed, then `closed` fires again, nothing resets.
    describe('onDrawerClosedSignal() — idempotent (closed) guard (CRD-T-4 forward pointer 4)', () => {
      it('does nothing when the drawer is already closed', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');
        component.closeDrawer();
        const closeDrawerSpy = jest.spyOn(component, 'closeDrawer');

        component.onDrawerClosedSignal();

        expect(closeDrawerSpy).not.toHaveBeenCalled();
        expect(component.drawerOpen()).toBe(false);
      });

      it('closes the drawer on the first (real) close signal, then a second late one is a no-op (idempotent)', () => {
        component.notification = buildBilateral();
        component.openDrawer('align');

        component.onDrawerClosedSignal();
        expect(component.drawerOpen()).toBe(false);
        expect(component.tocInitiative).toBeNull();

        // The late, animation-delayed real `closed` event: fires again, nothing left to reset.
        component.onDrawerClosedSignal();
        expect(component.drawerOpen()).toBe(false);
        expect(component.tocInitiative).toBeNull();
      });
    });
  });

  // CRD-T-4/T-7: row interactivity gating (CRD-R-1) and the popup/drawer coexistence guarantee
  // (CRD-R-11 amended, CRD-DD-10 pivot), driven through the real rendered template with genuine
  // BUBBLING events — a plain `new Event('click')` never bubbles regardless of `stopPropagation()`,
  // so these use `{ bubbles: true }` on purpose.
  describe('CRD-T-4 — row interactivity & popup removal (falsifiers)', () => {
    const buildFixture = (overrides: any = {}) => ({
      share_result_request_id: 6001,
      result_id: '8001',
      request_status_id: 1,
      requested_date: '2026-09-25T10:00:00.000Z',
      is_map_to_toc: true,
      obj_requested_by: { id: 1, first_name: 'Jane', last_name: 'Doe' },
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: 'RC-8001',
        title: 'A row-interactivity fixture result',
        status_id: '1',
        source_name: 'W1/W2',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P25' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        obj_results_toc_result: [],
        ...(overrides.obj_result ?? {})
      }
    });

    beforeEach(() => {
      mockApiService.rolesSE.platformIsClosed = false;
      mockApiService.rolesSE.isAdmin = false;
      component.requestingAccept = false;
      component.requestingReject = false;
      component.isSent = false;
    });

    it('exposes a pending, non-Sent row as an interactive control (CRD-R-1 keyboard open)', () => {
      component.notification = buildFixture({ request_status_id: 1 });
      component.isSent = false;
      fixture.detectChanges();

      const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
      expect(row.getAttribute('role')).toBe('button');
      expect(row.getAttribute('tabindex')).toBe('0');
      expect(row.getAttribute('aria-label')).toContain('RC-8001');
    });

    it('a decided (status 2) row has no role/tabindex and does not open the drawer', () => {
      component.notification = buildFixture({ request_status_id: 2 });
      component.isSent = false;
      fixture.detectChanges();

      const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
      expect(row.getAttribute('role')).toBeNull();
      expect(row.getAttribute('tabindex')).toBeNull();

      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(component.drawerOpen()).toBe(false);
    });

    it('a Sent row is not focusable and does not open the drawer, even though request_status_id is 1', () => {
      component.notification = buildFixture({ request_status_id: 1 });
      component.isSent = true;
      fixture.detectChanges();

      const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
      expect(row.getAttribute('role')).toBeNull();
      expect(row.getAttribute('tabindex')).toBeNull();

      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(component.drawerOpen()).toBe(false);
    });

    it('clicking the row body opens the drawer on details', () => {
      component.notification = buildFixture({ request_status_id: 1 });
      fixture.detectChanges();

      const body: HTMLElement = fixture.nativeElement.querySelector('.notification_content_body_text');
      body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(component.drawerOpen()).toBe(true);
      expect(component.drawerMode()).toBe('decide');
      expect(component.drawerFocusAlign()).toBe(false);
    });

    // Falsifier (CRD-T-7, CRD-R-10 amended): row Accept on a bilateral request opens the POPUP
    // (`showTocPromptDialog`), never the drawer — and a real bubbling click must not also reach
    // `.notification` and call `openDrawer('details')` through the row handler.
    it('a bubbling click on Accept opens the popup, not the drawer, through the row handler (CRD-R-10)', () => {
      component.notification = buildFixture({ request_status_id: 1, is_map_to_toc: false, obj_result: { source_name: 'W3/Bilaterals' } });
      fixture.detectChanges();
      const openDrawerSpy = jest.spyOn(component, 'openDrawer');

      const acceptBtn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="accept-contribution-btn"]');
      acceptBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(component.showTocPromptDialog()).toBe(true);
      expect(component.drawerOpen()).toBe(false);
      expect(openDrawerSpy).not.toHaveBeenCalled();
    });

    // Falsifier (CRD-T-7, CRD-R-10 amended): row Decline opens the reject-confirm POPUP, never the
    // drawer — same bubbling-guard rationale as Accept above.
    it('a bubbling click on Decline opens the popup, not the drawer, through the row handler (CRD-R-10)', () => {
      component.notification = buildFixture({ request_status_id: 1 });
      fixture.detectChanges();
      const openDrawerSpy = jest.spyOn(component, 'openDrawer');

      const declineBtn: HTMLElement = fixture.nativeElement.querySelector('[data-testid="decline-contribution-btn"]');
      declineBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(component.showConfirmRejectDialog()).toBe(true);
      expect(component.drawerOpen()).toBe(false);
      expect(openDrawerSpy).not.toHaveBeenCalled();
    });

    it('a bubbling click on the result link does not open the drawer', () => {
      component.notification = buildFixture({ request_status_id: 1 });
      fixture.detectChanges();
      const openDrawerSpy = jest.spyOn(component, 'openDrawer');

      const resultLink: HTMLElement = fixture.nativeElement.querySelector('.notification_content_body a');
      resultLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(openDrawerSpy).not.toHaveBeenCalled();
    });

    it('a bubbling click on the bilateral result span does not open the drawer', () => {
      component.notification = buildFixture({ request_status_id: 1, is_map_to_toc: false, obj_result: { source_name: 'W3/Bilaterals' } });
      fixture.detectChanges();
      const openDrawerSpy = jest.spyOn(component, 'openDrawer');
      const navigateSpy = jest.spyOn(component, 'navigateToResult').mockImplementation(() => undefined as any);

      const bilateralLink: HTMLElement = fixture.nativeElement.querySelector('.notification_content_body span.font-mono');
      bilateralLink.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(navigateSpy).toHaveBeenCalled();
      expect(openDrawerSpy).not.toHaveBeenCalled();
    });

    // Leader addition (CRD-T-4 rework, attempt 2): keyboard activation of the result link counts as
    // "a click on the result link" for CRD-R-1's "must NOT also open the drawer" — a real Enter on a
    // focused nested link bubbles as a `keydown` event (unlike `click`, which the link's own handler
    // stops), so the row's `(keydown.enter)` handler needs its own guard, not just the link's
    // `stopPropagation()`.
    it('a keydown.enter dispatched on the result link does not open the drawer, while Enter on the row still does', () => {
      component.notification = buildFixture({ request_status_id: 1 });
      fixture.detectChanges();

      const resultLink: HTMLElement = fixture.nativeElement.querySelector('.notification_content_body a');
      resultLink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(component.drawerOpen()).toBe(false);

      const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
      row.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(component.drawerOpen()).toBe(true);
    });

    it('renders no [crdAlign] block for a ToC-carried (non-bilateral) request', () => {
      component.notification = buildFixture({ request_status_id: 1, is_map_to_toc: true, obj_result: { source_name: 'W1/W2' } });
      component.openDrawer('details');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[crdAlign]')).toBeNull();
    });

    it('renders no [crdAlign] block for a legacy request', () => {
      component.notification = buildFixture({ request_status_id: 1, is_map_to_toc: false, obj_result: { source_name: 'W1/W2' } });
      component.openDrawer('details');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[crdAlign]')).toBeNull();
    });

    it('renders the [crdAlign] block for a bilateral request', () => {
      component.notification = buildFixture({ request_status_id: 1, is_map_to_toc: false, obj_result: { source_name: 'W3/Bilaterals' } });
      component.openDrawer('align');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[crdAlign]')).toBeTruthy();
    });

    // Leader addition (CRD-T-4 rework, attempt 2): CRD-R-8 "Busy" — Clear mapping must be disabled
    // while an accept/decline PATCH is in flight, same as the drawer's own Accept/Decline. Asserted
    // through the `BrnButton` directive instance (see the import above) rather than the native
    // `disabled` DOM attribute, which the shared Jest Brain stub never reflects.
    it('with requestingAccept = true, the rendered Clear mapping button is disabled', () => {
      component.notification = buildFixture({ request_status_id: 1, is_map_to_toc: false, obj_result: { source_name: 'W3/Bilaterals' } });
      component.openDrawer('align');
      component.tocInitiative.planned_result = true;
      component.requestingAccept = true;
      fixture.detectChanges();

      const clearBtn = fixture.debugElement.query(By.css('[data-testid="crd-align-clear-mapping-btn"]'));
      expect(clearBtn).toBeTruthy();
      expect(clearBtn.injector.get(BrnButton).disabled).toBe(true);

      // Defense-in-depth guard (onClearTocMappingActivate): a click while busy must not re-seed
      // tocInitiative even though the stub does not block the click at the DOM level.
      const seedSpy = jest.spyOn(component as any, 'seedTocInitiative');
      clearBtn.nativeElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(seedSpy).not.toHaveBeenCalled();
    });

    // CRD-R-11 (amended, pivot): the three popups are back in the template (CRD-DD-10), but none is
    // open while the drawer is open — checked with the DebugElement query the falsifier names, not
    // a template grep.
    it('renders 3 app-pr-dialog elements, none open while the drawer is open (CRD-R-11 amended)', () => {
      component.notification = buildFixture({ request_status_id: 1, is_map_to_toc: false, obj_result: { source_name: 'W3/Bilaterals' } });
      component.openDrawer('align');
      fixture.detectChanges();

      const dialogs = fixture.debugElement.queryAll(By.css('app-pr-dialog'));
      expect(dialogs.length).toBe(3);
      expect(component.showConfirmRejectDialog()).toBe(false);
      expect(component.showTocPromptDialog()).toBe(false);
      expect(component.showTocMappingDialog()).toBe(false);
    });
  });

  // CRD-T-7 (pivot, CRD-DD-10): the remaining falsifiers named in the task that are not already
  // covered above by a restored/flipped case.
  describe('CRD-T-7 — popup/drawer coexistence (falsifiers)', () => {
    const buildFixture = (overrides: any = {}) => ({
      share_result_request_id: 7001,
      result_id: '9001',
      request_status_id: 1,
      requested_date: '2026-09-25T10:00:00.000Z',
      is_map_to_toc: true,
      obj_requested_by: { id: 1, first_name: 'Jane', last_name: 'Doe' },
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: 'RC-9001',
        title: 'A coexistence fixture result',
        status_id: '1',
        source_name: 'W1/W2',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P25' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        obj_results_toc_result: [],
        ...(overrides.obj_result ?? {})
      }
    });

    beforeEach(() => {
      mockApiService.rolesSE.platformIsClosed = false;
      mockApiService.rolesSE.isAdmin = false;
      component.requestingAccept = false;
      component.requestingReject = false;
      component.isSent = false;
    });

    // Falsifier: openDrawer() leaves a dialog signal true.
    it('openDrawer() resets all three popup dialog signals to false', () => {
      component.notification = buildFixture({ is_map_to_toc: false, obj_result: { source_name: 'W3/Bilaterals' } });
      component.showConfirmRejectDialog.set(true);
      component.showTocPromptDialog.set(true);
      component.showTocMappingDialog.set(true);

      component.openDrawer('details');

      expect(component.showConfirmRejectDialog()).toBe(false);
      expect(component.showTocPromptDialog()).toBe(false);
      expect(component.showTocMappingDialog()).toBe(false);
    });

    // Falsifier: onDrawerAccept() or any drawer footer output sets a dialog signal to true.
    it('nothing reachable from the drawer sets a popup dialog signal to true', () => {
      component.notification = buildFixture();
      component.openDrawer('details');

      component.onDrawerAccept();
      expect(component.showConfirmRejectDialog()).toBe(false);
      expect(component.showTocPromptDialog()).toBe(false);
      expect(component.showTocMappingDialog()).toBe(false);

      component.notification = buildFixture({ is_map_to_toc: false, obj_result: { source_name: 'W3/Bilaterals' } });
      component.openDrawer('confirm-decline');
      // The drawer's own footer outputs (`declineClicked`/`declineCancelled`) only move `drawerMode`.
      component.drawerMode.set('confirm-decline');
      component.drawerMode.set('decide');
      expect(component.showConfirmRejectDialog()).toBe(false);
      expect(component.showTocPromptDialog()).toBe(false);
      expect(component.showTocMappingDialog()).toBe(false);
    });

    // Falsifier: a ToC-carried row no longer renders the toc_review block.
    it('renders the toc_review block for a ToC-carried row (CRD-R-4/R-11 amended)', () => {
      component.notification = buildFixture({
        request_status_id: 1,
        is_map_to_toc: true,
        obj_result: { source_name: 'W1/W2' },
        toc_contribution_review: [{ level: 'Output', outcome_label: 'HLO1', target: 6, contribution_target: 2 }]
      });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.toc_review')).toBeTruthy();
    });
  });
});

