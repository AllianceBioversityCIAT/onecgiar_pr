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
// NOTIF-T-5: property-based chip check — every rendered type chip must be a member of this set
// (or the fixed "Contribution request" string), never a fabricated label (NOTIF-R-3/NOTIF-AC-7).
import { NotificationType } from '../../../../../../../../shared/constants/notification-type.constants';

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

    it('renders both the "Declined by …" text and the decision chip for request_status_id 3', () => {
      component.notification = buildRenderableNotification({ request_status_id: 3 });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      expect(root.textContent).toContain('Declined by');
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

  // NOTIF-T-12 (rework attempt 2, issue 3): the wording/button Falsifier items from the FAIL had
  // no test coverage. Assert the exact copy on a pending (request_status_id 1), non-Sent, non-ToC
  // Received row — case (1) of the template's @switch, the only branch these strings apply to.
  describe('NOTIF-T-12 rework — pending row wording + button labels', () => {
    const buildRenderableNotification = (overrides: any = {}) => ({
      share_result_request_id: 4001,
      result_id: '9001',
      requested_date: '2026-09-20T10:00:00.000Z',
      is_map_to_toc: false,
      obj_requested_by: { id: 1, first_name: 'Jane', last_name: 'Doe' },
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

    it('renders "has requested the inclusion of" (not "inclusion of") for a pending Received row', () => {
      component.notification = buildRenderableNotification({ request_status_id: 1 });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const bodyText = root.querySelector('.notification_content_body_text')?.textContent?.replace(/\s+/g, ' ').trim();

      expect(bodyText).toContain('has requested the inclusion of');
    });

    it('renders "Accept contribution" and "Decline" as the two action button labels', () => {
      component.notification = buildRenderableNotification({ request_status_id: 1 });
      fixture.detectChanges();

      const root: HTMLElement = fixture.nativeElement;
      const acceptBtn: any = root.querySelector('[data-testid="accept-contribution-btn"]');
      const declineBtn: any = root.querySelector('[data-testid="decline-contribution-btn"]');

      expect(acceptBtn).toBeTruthy();
      expect(declineBtn).toBeTruthy();
      // `app-pr-button` isn't declared/imported in this suite's TestBed (NO_ERRORS_SCHEMA, see the
      // module config above) so it never renders its own label as textContent — assert the bound
      // `[text]` property Angular still sets directly on the (unknown) custom element instead.
      expect(acceptBtn.text).toBe('Accept contribution');
      expect(declineBtn.text).toBe('Decline');
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

      // NOTIF-T-7 — NOTIF-AC-5 Falsifier: "the panel updates to B's content; any of A's transient
      // in-progress state (e.g. an unsubmitted Align selection) is discarded, not silently merged
      // into B." Each `<app-notification-item>` in the unified list is its own component instance
      // bound to its own row (results-notifications.component.html's `@for … track
      // trackNotificationKey(item)`), so there is no shared state ACROSS two simultaneously-rendered
      // rows to leak by construction — the one place a leak IS structurally possible is `openDrawer()`
      // being invoked a second time on the SAME instance for a DIFFERENT `notification` (a row
      // reactivated after its bound `@Input()` changed underneath it — the exact shape of the CRD-DD-6
      // "instance reuse" trap this file's own CLAUDE.md documents), without an intervening
      // `closeDrawer()`. This proves `openDrawer()`'s reseed (`seedTocInitiative()`) always wins over
      // whatever was left in progress for the previous notification, never merges the two.
      it('re-opening for a DIFFERENT notification discards the previous unsubmitted Align selection instead of merging it (NOTIF-AC-5)', () => {
        component.notification = buildBilateral({ share_result_request_id: 5001, obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'A' } });
        component.openDrawer('details');
        // An in-progress, NEVER submitted/closed Align answer for notification A.
        component.tocInitiative.planned_result = true;
        expect(component.isTocMappingTouched()).toBe(true);

        // The row is reactivated for a different notification (B) — same instance, no closeDrawer()
        // in between, mirroring what a re-bound `@Input()` + a second `onRowActivate()` would do.
        component.notification = buildBilateral({
          share_result_request_id: 5099,
          obj_shared_inititiative: { id: 88, official_code: 'INIT-88', name: 'B' }
        });
        component.openDrawer('details');

        expect(component.tocInitiative.initiative_id).toBe(88);
        expect(component.tocInitiative.official_code).toBe('INIT-88');
        expect(component.tocInitiative.planned_result).toBeNull();
        expect(component.isTocMappingTouched()).toBe(false);
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

    // NOTIF-T-5 (design.md §2.2): superseded by the unified click-to-open surface — a decided row
    // is now interactive too, opening the drawer in `view` mode (no footer, no Align) instead of
    // staying inert. The pending-row case right above this one is UNCHANGED (CRD-DD-10).
    it('a decided (status 2) row is interactive and opens the drawer in view mode (NOTIF-T-5)', () => {
      component.notification = buildFixture({ request_status_id: 2 });
      component.isSent = false;
      fixture.detectChanges();

      const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
      expect(row.getAttribute('role')).toBe('button');
      expect(row.getAttribute('tabindex')).toBe('0');

      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(component.drawerOpen()).toBe(true);
      expect(component.drawerMode()).toBe('view');
    });

    // NOTIF-T-5: superseded — a Sent row is now interactive too (Sent rows are always
    // `needsDecision:false` per NOTIF-P-1), opening the drawer in `view` mode, never `decide`
    // (CRD-DD-10's pending gate — `isPending` — still returns false for a Sent row).
    it('a Sent row is focusable and opens the drawer in view mode, never decide, even though request_status_id is 1 (NOTIF-T-5)', () => {
      component.notification = buildFixture({ request_status_id: 1 });
      component.isSent = true;
      fixture.detectChanges();

      const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
      expect(row.getAttribute('role')).toBe('button');
      expect(row.getAttribute('tabindex')).toBe('0');

      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(component.drawerOpen()).toBe(true);
      expect(component.drawerMode()).toBe('view');
      expect(component.isPending).toBe(false);
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

  // NOTIF-T-5: extends the row click-to-open surface to resolved Received rows, Sent rows and
  // Updates rows (design.md §2.2); real chip taxonomy (NOTIF-R-3/NOTIF-DD-3); the close-panel
  // toggle (NOTIF-R-11); the `[crdAlign]` gate (item 1); the row status indicator (item 2).
  describe('NOTIF-T-5 — resolved/Sent/Updates click-to-open, chip taxonomy, status indicator', () => {
    const buildRequestFixture = (overrides: any = {}) => ({
      share_result_request_id: 8001,
      result_id: '9501',
      request_status_id: 2,
      requested_date: '2026-09-25T10:00:00.000Z',
      aprovaed_date: '2026-09-26T10:00:00.000Z',
      is_map_to_toc: true,
      obj_requested_by: { id: 1, first_name: 'Jane', last_name: 'Doe' },
      obj_approved_by: { id: 2, first_name: 'Ann', last_name: 'Approver' },
      obj_owner_initiative: { id: 31, official_code: 'INIT-31', name: 'Owner program' },
      obj_shared_inititiative: { id: 77, official_code: 'INIT-77', name: 'Contributor program' },
      ...overrides,
      obj_result: {
        result_code: 'RC-9501',
        title: 'A NOTIF-T-5 fixture result',
        status_id: '1',
        source_name: 'W1/W2',
        obj_version: { id: '30', phase_name: 'Reporting 2026', status: true, obj_portfolio: { acronym: 'P25' } },
        obj_result_type: { id: 7, name: 'Innovation development' },
        obj_result_level: { id: 4, name: 'Initiative output' },
        obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP07' } }],
        obj_results_toc_result: [],
        ...(overrides.obj_result ?? {})
      }
    });

    const buildUpdateFixture = (overrides: any = {}) => ({
      source: 'update',
      notification_level: 2,
      notification_type: 1,
      obj_notification_type: { type: NotificationType.RESULT_SUBMITTED },
      created_date: '2026-09-20T10:00:00.000Z',
      obj_emitter_user: { id: 4, first_name: 'Amy', last_name: 'Lopez' },
      ...overrides,
      obj_result: {
        result_code: 'RC-5500',
        title: 'An updates-tab result',
        obj_version: { id: '30', phase_name: 'Reporting 2026' },
        obj_result_by_initiatives: [{ obj_initiative: { official_code: 'SP09' } }],
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

    describe('resolved Received row (NOTIF-AC-2/AC-3)', () => {
      it('clicking the result-title link does NOT open the drawer', () => {
        component.notification = buildRequestFixture({ request_status_id: 2 });
        fixture.detectChanges();
        const openDrawerSpy = jest.spyOn(component, 'openDrawer');

        const link: HTMLElement = fixture.nativeElement.querySelector('.notification_content_body a');
        link.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(openDrawerSpy).not.toHaveBeenCalled();
        expect(component.drawerOpen()).toBe(false);
      });

      it('clicking anywhere else opens the drawer in view mode', () => {
        component.notification = buildRequestFixture({ request_status_id: 2 });
        fixture.detectChanges();

        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(component.drawerOpen()).toBe(true);
        expect(component.drawerMode()).toBe('view');
      });
    });

    describe('Sent row (NOTIF-AC-2/AC-3)', () => {
      it('clicking the result-title link does NOT open the drawer', () => {
        component.notification = buildRequestFixture({ request_status_id: 3 });
        component.isSent = true;
        fixture.detectChanges();
        const openDrawerSpy = jest.spyOn(component, 'openDrawer');

        const link: HTMLElement = fixture.nativeElement.querySelector('.notification_content_body a');
        link.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(openDrawerSpy).not.toHaveBeenCalled();
        expect(component.drawerOpen()).toBe(false);
      });

      it('clicking anywhere else opens the drawer in view mode', () => {
        component.notification = buildRequestFixture({ request_status_id: 3 });
        component.isSent = true;
        fixture.detectChanges();

        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(component.drawerOpen()).toBe(true);
        expect(component.drawerMode()).toBe('view');
      });
    });

    describe('Updates row (no role/tabindex/openDrawer entry point before this task)', () => {
      it('is exposed as an interactive control with the generic view aria-label', () => {
        component.notification = buildUpdateFixture();
        fixture.detectChanges();

        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
        expect(row.getAttribute('role')).toBe('button');
        expect(row.getAttribute('tabindex')).toBe('0');
        expect(row.getAttribute('aria-label')).toContain('RC-5500');
      });

      it('clicking the result-title link does NOT open the drawer', () => {
        component.notification = buildUpdateFixture();
        fixture.detectChanges();
        const openDrawerSpy = jest.spyOn(component, 'openDrawer');

        const link: HTMLElement = fixture.nativeElement.querySelector('.notification_content_body a');
        link.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(openDrawerSpy).not.toHaveBeenCalled();
        expect(component.drawerOpen()).toBe(false);
      });

      it('clicking anywhere else opens the drawer in view mode, never decide', () => {
        component.notification = buildUpdateFixture();
        fixture.detectChanges();

        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(component.drawerOpen()).toBe(true);
        expect(component.drawerMode()).toBe('view');
      });

      it('renders the resolved NotificationType label as the type chip, and body text via getResultNotificationTextParts()', () => {
        component.notification = buildUpdateFixture();
        fixture.detectChanges();

        const root: HTMLElement = fixture.nativeElement;
        const chip = root.querySelector('[data-notif-type-chip]');
        expect(chip?.textContent?.trim()).toBe(NotificationType.RESULT_SUBMITTED);
        expect(root.textContent).toContain('Amy Lopez');
        expect(root.textContent).toContain('has submitted the result');
      });

      it('omits the type chip entirely for an unresolvable notification type (never fabricates a label)', () => {
        component.notification = buildUpdateFixture({ obj_notification_type: null, notification_type: 999 });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[data-notif-type-chip]')).toBeNull();
      });

      it('drawerViewFields() supplies the emitter as submittedBy, source "update", and the phase', () => {
        component.notification = buildUpdateFixture();

        const fields = component.drawerViewFields();

        expect(fields.source).toBe('update');
        expect(fields.submittedBy).toBe('Amy Lopez');
        expect(fields.phase).toBe('Reporting 2026');
      });
    });

    // NOTIF-T-14 (closes the NOTIF-R-5 gap left by NOTIF-T-12's removal of the row-level status
    // badge): `drawerViewFields()` must supply `status` from the same `rowStatusLabel` getter the
    // row itself used to render, for all three row-status cases.
    describe('drawerViewFields() status (NOTIF-T-14)', () => {
      it('a pending Received row (needs your decision)', () => {
        component.notification = buildRequestFixture({ request_status_id: 1 });
        component.isSent = false;

        const fields = component.drawerViewFields();

        expect(fields.status).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.statusNeedsDecision);
      });

      it('a resolved Received row (for your information)', () => {
        component.notification = buildRequestFixture({ request_status_id: 2 });
        component.isSent = false;

        const fields = component.drawerViewFields();

        expect(fields.status).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.statusInfo);
      });

      it('an Updates row (for your information)', () => {
        component.notification = buildUpdateFixture();

        const fields = component.drawerViewFields();

        expect(fields.status).toBe(CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.statusInfo);
      });
    });

    describe('type chip taxonomy (property-based, NOTIF-R-3/NOTIF-DD-3)', () => {
      const knownLabels = new Set<string>([CONTRIBUTION_REQUEST_DRAWER_COPY.notificationItem.contributionRequestChip, ...Object.values(NotificationType)]);

      // Unrolled (not looped, and reusing the outer `component`/`fixture` exactly like every other
      // test in this file) — one notification assignment, one `detectChanges()` call, per case.
      it('a pending (1) request row renders exactly the "Contribution request" chip', () => {
        component.notification = buildRequestFixture({ request_status_id: 1 });
        fixture.detectChanges();
        const chip = fixture.nativeElement.querySelector('[data-notif-type-chip]');
        expect(chip).toBeTruthy();
        expect(knownLabels.has(chip.textContent.trim())).toBe(true);
        expect(chip.textContent.trim()).toBe('Contribution request');
      });

      it('an accepted (2) request row renders exactly the "Contribution request" chip', () => {
        component.notification = buildRequestFixture({ request_status_id: 2 });
        fixture.detectChanges();
        const chip = fixture.nativeElement.querySelector('[data-notif-type-chip]');
        expect(chip).toBeTruthy();
        expect(knownLabels.has(chip.textContent.trim())).toBe(true);
        expect(chip.textContent.trim()).toBe('Contribution request');
      });

      it('a declined (3) request row renders exactly the "Contribution request" chip', () => {
        component.notification = buildRequestFixture({ request_status_id: 3 });
        fixture.detectChanges();
        const chip = fixture.nativeElement.querySelector('[data-notif-type-chip]');
        expect(chip).toBeTruthy();
        expect(knownLabels.has(chip.textContent.trim())).toBe(true);
        expect(chip.textContent.trim()).toBe('Contribution request');
      });

      it('an update row of type Result Submitted renders that type as the chip, a member of the known set', () => {
        component.notification = buildUpdateFixture({ obj_notification_type: { type: NotificationType.RESULT_SUBMITTED } });
        fixture.detectChanges();
        const chip = fixture.nativeElement.querySelector('[data-notif-type-chip]');
        expect(chip).toBeTruthy();
        expect(knownLabels.has(chip.textContent.trim())).toBe(true);
      });

      it('an update row of type Result QAed renders that type as the chip, a member of the known set', () => {
        component.notification = buildUpdateFixture({ obj_notification_type: { type: NotificationType.RESULT_QUALITY_ASSESSED } });
        fixture.detectChanges();
        const chip = fixture.nativeElement.querySelector('[data-notif-type-chip]');
        expect(chip).toBeTruthy();
        expect(knownLabels.has(chip.textContent.trim())).toBe(true);
      });

      it('an update row of type Announcement renders that type as the chip, a member of the known set', () => {
        component.notification = buildUpdateFixture({ obj_notification_type: { type: NotificationType.ANNOUNCEMENT } });
        fixture.detectChanges();
        const chip = fixture.nativeElement.querySelector('[data-notif-type-chip]');
        expect(chip).toBeTruthy();
        expect(knownLabels.has(chip.textContent.trim())).toBe(true);
      });
    });

    describe('status chip removed from the row (NOTIF-T-12, item 5)', () => {
      // NOTIF-T-12: the per-row status chip never appeared in the user's reference image and was
      // removed from all 4 template branches. `rowStatusLabel` itself is kept (harmless, unused) —
      // these assertions prove the RENDER is gone, not that the getter disappeared.
      it('never renders [data-notif-status-chip] for a pending Received row', () => {
        component.notification = buildRequestFixture({ request_status_id: 1 });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-notif-status-chip]')).toBeNull();
        expect(component.rowStatusLabel).toBe('Needs your decision');
      });

      it('never renders [data-notif-status-chip] for a pending Sent row', () => {
        component.notification = buildRequestFixture({ request_status_id: 1 });
        component.isSent = true;
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-notif-status-chip]')).toBeNull();
      });

      it('never renders [data-notif-status-chip] for a resolved (accepted) row', () => {
        component.notification = buildRequestFixture({ request_status_id: 2 });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-notif-status-chip]')).toBeNull();
      });

      it('never renders [data-notif-status-chip] for a resolved (declined) row', () => {
        component.notification = buildRequestFixture({ request_status_id: 3 });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-notif-status-chip]')).toBeNull();
      });

      it('never renders [data-notif-status-chip] for an Updates row', () => {
        component.notification = buildUpdateFixture();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-notif-status-chip]')).toBeNull();
        expect(component.rowStatusLabel).toBe('For your information');
      });
    });

    describe('NOTIF-T-9 — funding/type/level badges (NOTIF-R-12)', () => {
      it('renders the funding-window and result level/type badges for a fully-populated Requests-tab row', () => {
        component.notification = buildRequestFixture({
          request_status_id: 1,
          obj_result: {
            source_name: 'W3/Bilaterals',
            obj_result_type: { id: 7, name: 'Innovation development' },
            obj_result_level: { id: 4, name: 'Output' }
          }
        });
        fixture.detectChanges();

        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('[data-notif-funding-chip]')?.textContent?.trim()).toBe('W3/Bilateral');
        // NOTIF-T-13: the level/type badge is no longer its own chip — it's plain text sharing the
        // `.notification_date` line with the time-ago, joined by " · ".
        expect(root.querySelector('.notification_date')?.textContent).toContain('Output · Innovation development');
      });

      it('renders "W1/W2" for a W1/W2 row', () => {
        component.notification = buildRequestFixture({ request_status_id: 1, obj_result: { source_name: 'W1/W2' } });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('[data-notif-funding-chip]')?.textContent?.trim()).toBe('W1/W2');
      });

      it('omits both badges (no placeholder) when neither field is present', () => {
        component.notification = buildRequestFixture({
          request_status_id: 1,
          obj_result: { source_name: undefined, obj_result_type: undefined, obj_result_level: undefined }
        });
        fixture.detectChanges();

        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('[data-notif-funding-chip]')).toBeNull();
        // NOTIF-T-13: no separate level/type chip exists anymore; assert the plain-text line never
        // shows a dangling " · " when there's no real label to join it with.
        expect(root.querySelector('.notification_date')?.textContent).not.toContain('·');
      });

      it('renders the level/type badge from whichever of the two fields is present, never a blank placeholder', () => {
        component.notification = buildRequestFixture({
          request_status_id: 1,
          obj_result: { obj_result_type: { id: 7, name: 'Innovation development' }, obj_result_level: undefined }
        });
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('.notification_date')?.textContent).toContain('Innovation development');
      });

      it('extends to Updates-tab rows once the fields are present (NOTIF-T-8 widening)', () => {
        component.notification = buildUpdateFixture({
          obj_result: {
            source_name: 'W3/Bilaterals',
            obj_result_type: { id: 7, name: 'Innovation development' },
            obj_result_level: { id: 4, name: 'Output' }
          }
        });
        fixture.detectChanges();

        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('[data-notif-funding-chip]')?.textContent?.trim()).toBe('W3/Bilateral');
        expect(root.querySelector('.notification_date')?.textContent).toContain('Output · Innovation development');
      });

      it('omits the badges for an Updates-tab row that lacks the fields entirely (pre-NOTIF-T-8 shape)', () => {
        component.notification = buildUpdateFixture();
        fixture.detectChanges();

        const root: HTMLElement = fixture.nativeElement;
        expect(root.querySelector('[data-notif-funding-chip]')).toBeNull();
        expect(root.querySelector('.notification_date')?.textContent).not.toContain('·');
      });

      it('resultLevelTypeBadge/fundingWindowBadge getters return null defensively for a missing obj_result', () => {
        component.notification = { request_status_id: 1 };

        expect(component.fundingWindowBadge).toBeNull();
        expect(component.resultLevelTypeBadge).toBeNull();
      });
    });

    describe('generic bilateral project caption removed (NOTIF-T-12, item 2)', () => {
      // NOTIF-T-12 (`NOTIF-R-14` corrected): `obj_result.obj_result_by_project` is per-RESULT, not
      // per-notification-event — rendering it as a caption on every row kind was the defect. The
      // real per-notification project name now flows only through `RESULT_BILATERAL_PROJECT_TAGGED`'s
      // own message text (`notification-type.constants.spec.ts`), never as a row caption here.
      it('never renders [data-notif-bilateral-project] on a pending Received row, even with obj_result_by_project populated', () => {
        component.notification = buildRequestFixture({
          request_status_id: 1,
          obj_result: { obj_result_by_project: [{ obj_clarisa_project: { shortName: 'ProjectX' } }] }
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-notif-bilateral-project]')).toBeNull();
        expect((component as any).bilateralProjectName).toBeUndefined();
      });

      it('never renders [data-notif-bilateral-project] on a resolved row', () => {
        component.notification = buildRequestFixture({
          request_status_id: 2,
          obj_result: { obj_result_by_project: [{ obj_clarisa_project: { shortName: 'ProjectX' } }] }
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-notif-bilateral-project]')).toBeNull();
      });

      it('never renders [data-notif-bilateral-project] on an Updates row', () => {
        component.notification = buildUpdateFixture({
          obj_result: { obj_result_by_project: [{ obj_clarisa_project: { shortName: 'UpdatesProject' } }] }
        });
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-notif-bilateral-project]')).toBeNull();
      });
    });

    describe('close-panel toggle (NOTIF-R-11)', () => {
      it('clicking the same open row again closes the panel', () => {
        component.notification = buildRequestFixture({ request_status_id: 2 });
        fixture.detectChanges();
        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');

        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(component.drawerOpen()).toBe(true);

        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(component.drawerOpen()).toBe(false);
      });

      it('a pending row still opens on the first click, unchanged (CRD-DD-10), and the toggle still closes it', () => {
        component.notification = buildRequestFixture({ request_status_id: 1, is_map_to_toc: true });
        fixture.detectChanges();
        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');

        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(component.drawerOpen()).toBe(true);
        expect(component.drawerMode()).toBe('decide');

        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(component.drawerOpen()).toBe(false);
      });
    });

    describe('[crdAlign] gating (item 1) — never present in view mode', () => {
      // Rework (attempt 2): `openDrawer()` never seeds `tocInitiative` in `view` mode anyway, so the
      // original version of this test passed regardless of whether the `drawerMode()` gate itself
      // did anything — it never isolated the gate. Planting a non-null `tocInitiative` BEFORE
      // triggering `view` mode proves the `(drawerMode() === 'decide' || ... === 'confirm-decline')`
      // clause is what's actually suppressing the block, not `tocInitiative` happening to be null.
      it('does not render [crdAlign] when a bilateral result is opened in view mode (resolved row), even with a non-null tocInitiative planted', () => {
        component.notification = buildRequestFixture({
          request_status_id: 2,
          is_map_to_toc: false,
          obj_result: { source_name: 'W3/Bilaterals' }
        });
        component.tocInitiative = { planned_result: null, initiative_id: 77, official_code: 'INIT-77', result_toc_results: [] };
        component.openDrawer('details');
        fixture.detectChanges();

        expect(component.drawerMode()).toBe('view');
        expect(component.tocInitiative).not.toBeNull();
        expect(fixture.nativeElement.querySelector('[crdAlign]')).toBeNull();
      });

      it('still renders [crdAlign] for a bilateral result opened in decide mode (unchanged, CRD-DD-10)', () => {
        component.notification = buildRequestFixture({
          request_status_id: 1,
          is_map_to_toc: false,
          obj_result: { source_name: 'W3/Bilaterals' }
        });
        component.openDrawer('align');
        fixture.detectChanges();

        expect(component.drawerMode()).toBe('decide');
        expect(fixture.nativeElement.querySelector('[crdAlign]')).toBeTruthy();
      });
    });

    // NOTIF-T-5 (rework, attempt 2): the blocking fix. `drawerReviewRowsForMode()` — not
    // `drawerReviewTables()` directly — feeds the drawer's `[reviewRows]` input, so a `view`-mode
    // panel with no real `toc_contribution_review` data gets an EMPTY array, and the drawer's own
    // `@if (mode() !== 'view' || reviewRows().length)` guard (NOTIF-T-4) then hides the whole
    // "Where it contributes" section instead of rendering a fabricated-looking dash table.
    describe('drawerReviewRowsForMode() — view mode never shows the dash-fallback table (rework fix)', () => {
      it('hides [data-testid="crd-review-section"] for an Updates row in view mode with no real ToC data', () => {
        component.notification = buildUpdateFixture();
        fixture.detectChanges();

        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(component.drawerMode()).toBe('view');
        expect(component.drawerReviewRowsForMode()).toEqual([]);
        expect(fixture.nativeElement.querySelector('[data-testid="crd-review-section"]')).toBeNull();
      });

      it('hides [data-testid="crd-review-section"] for a resolved (no-ToC-mapping) request row in view mode', () => {
        component.notification = buildRequestFixture({
          request_status_id: 2,
          is_map_to_toc: false,
          obj_result: { source_name: 'W1/W2' },
          toc_contribution_review: []
        });
        fixture.detectChanges();

        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(component.drawerMode()).toBe('view');
        expect(component.drawerReviewRowsForMode()).toEqual([]);
        expect(fixture.nativeElement.querySelector('[data-testid="crd-review-section"]')).toBeNull();
      });

      it('shows [data-testid="crd-review-section"] with the real data for a resolved request row in view mode that DOES carry toc_contribution_review', () => {
        const entry = { level: 'Output', outcome_label: 'HLO1.AOW1.IO1', outcome_statement: 'Statement text', target: 6, contribution_target: 2 };
        component.notification = buildRequestFixture({
          request_status_id: 2,
          is_map_to_toc: true,
          toc_contribution_review: [entry]
        });
        fixture.detectChanges();

        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(component.drawerMode()).toBe('view');
        const rows = component.drawerReviewRowsForMode();
        expect(rows).toHaveLength(1);
        expect(rows[0].find(f => f.label === 'Level')?.value).toBe('Output');

        const section = fixture.nativeElement.querySelector('[data-testid="crd-review-section"]');
        expect(section).toBeTruthy();
        expect(section.textContent).toContain('Output');
      });

      it('regression: a pending row in decide mode with no real ToC data still shows the dash-fallback table (decide/confirm-decline untouched)', () => {
        component.notification = buildRequestFixture({ request_status_id: 1, is_map_to_toc: true, toc_contribution_review: [] });
        fixture.detectChanges();

        const row: HTMLElement = fixture.nativeElement.querySelector('.notification');
        row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fixture.detectChanges();

        expect(component.drawerMode()).toBe('decide');
        const rows = component.drawerReviewRowsForMode();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toHaveLength(7);
        expect(rows[0].every(field => field.value === CONTRIBUTION_REQUEST_DRAWER_COPY.dashValue)).toBe(true);

        const section = fixture.nativeElement.querySelector('[data-testid="crd-review-section"]');
        expect(section).toBeTruthy();
      });
    });
  });
  describe('Bilateral AI Job Finished row (no result behind it)', () => {
    const aiJobRow = () => ({
      source: 'update',
      notification_id: 5,
      result_id: null,
      obj_result: null,
      obj_emitter_user: null,
      created_date: new Date().toISOString(),
      text: 'AI-assisted processing finished — 1 draft ready for CIP · 1 document · 1 min https://reporting.cgiar.org/bilateral/CIP/drafts',
      obj_notification_type: { notifications_type_id: 13, type: 'Bilateral AI Job Finished' }
    });

    it('renders the sentence with a sparkles avatar and no empty result link', () => {
      component.notification = aiJobRow();
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const text = el.querySelector('.notification_content_body_text')!.textContent!.trim();
      expect(text).toBe('AI-assisted processing finished — 1 draft ready for CIP · 1 document · 1 min');
      expect(el.querySelector('.notification_content_body_text a')).toBeNull();
      expect(el.querySelector('.notification_avatar .material-icons-round')?.textContent?.trim()).toBe('auto_awesome');
    });

    it('a click goes to the drafts instead of opening the empty contribution drawer', () => {
      component.notification = aiJobRow();
      const navigate = jest.spyOn((component as any).router, 'navigateByUrl').mockResolvedValue(true);
      const openDrawer = jest.spyOn(component as any, 'openDrawer');
      component.onRowActivate();
      expect(navigate).toHaveBeenCalledWith('/bilateral/CIP/drafts');
      expect(openDrawer).not.toHaveBeenCalled();
    });
  });
});

