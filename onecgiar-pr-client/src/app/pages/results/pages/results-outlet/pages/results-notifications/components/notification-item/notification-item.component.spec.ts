import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationItemComponent } from './notification-item.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../../../../../../../../shared/services/api/api.service';
import { ShareRequestModalService } from '../../../../../result-detail/components/share-request-modal/share-request-modal.service';
import { RetrieveModalService } from '../../../../../result-detail/components/retrieve-modal/retrieve-modal.service';
import { of, throwError } from 'rxjs';
import { FormatTimeAgoPipe } from '../../../../../../../../shared/pipes/format-time-ago/format-time-ago.pipe';
import { signal } from '@angular/core';

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
      imports: [HttpClientTestingModule, FormatTimeAgoPipe],
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
      ]
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

    it('opens the optional ToC prompt — never the legacy mapping modal — for a bilateral request (AC1/AC4)', () => {
      component.notification = buildNotification();
      const acceptSpy = jest.spyOn(component, 'acceptOrReject');
      const mapSpy = jest.spyOn(component, 'mapAndAccept');

      component.onAcceptContribution();

      expect(component.showTocPromptDialog()).toBe(true);
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
      // The shared widget resolves the result id from the hydrated notification.
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
     * mapping step lives in THIS card and rides the same single PATCH; this test keeps it that way.
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
});

