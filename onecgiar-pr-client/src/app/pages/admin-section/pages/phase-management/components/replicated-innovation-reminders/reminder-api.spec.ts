// @akili-spec changes/replicated-innovation-reminders (RIR-T-6): exact URL + verb of each API method
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { SaveButtonService } from '../../../../../../custom-fields/save-button/save-button.service';
import { environment } from '../../../../../../../environments/environment';

describe('ResultsApiService reminder campaign methods', () => {
  let service: ResultsApiService;
  let http: HttpTestingController;
  const base = `${environment.apiBaseUrl}api/replicated-innovation-reminders/campaigns`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ResultsApiService, { provide: SaveButtonService, useValue: {} }]
    });
    service = TestBed.inject(ResultsApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('GET_reminderCampaigns -> GET /campaigns', () => {
    service.GET_reminderCampaigns().subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('POST_reminderCampaign -> POST /campaigns with the body', () => {
    const body = { kind: 'Q4_NOTICE' as const, scheduled_at: '2026-11-15T13:00:00.000Z' };
    service.POST_reminderCampaign(body).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('PATCH_reminderCampaignDate -> PATCH /campaigns/:id', () => {
    service.PATCH_reminderCampaignDate(7, { scheduled_at: '2026-11-15T13:00:00.000Z' }).subscribe();
    const req = http.expectOne(`${base}/7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ scheduled_at: '2026-11-15T13:00:00.000Z' });
    req.flush({});
  });

  it('PATCH_reminderCampaignCancel -> PATCH /campaigns/:id/cancel', () => {
    service.PATCH_reminderCampaignCancel(7).subscribe();
    const req = http.expectOne(`${base}/7/cancel`);
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('GET_reminderCampaignPreview -> GET /campaigns/:id/preview', () => {
    service.GET_reminderCampaignPreview(7).subscribe();
    const req = http.expectOne(`${base}/7/preview`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('POST_reminderCampaignSend -> POST /campaigns/:id/send', () => {
    service.POST_reminderCampaignSend(7).subscribe();
    const req = http.expectOne(`${base}/7/send`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('POST_reminderCampaignSend exposes the per-type sent counts of the envelope', () => {
    let sentByType: unknown;
    service.POST_reminderCampaignSend(7).subscribe(res => (sentByType = res.response.sent_by_type));
    http.expectOne(`${base}/7/send`).flush({
      response: { status: 'SENT', sent: 3, skipped: 0, failed: 0, unreachable: 0, sent_by_type: { DEVELOPER: 1, MELIA_SUMMARY: 1, CENTER: 1 } }
    });
    expect(sentByType).toEqual({ DEVELOPER: 1, MELIA_SUMMARY: 1, CENTER: 1 });
  });

  it('GET_reminderCampaignPreview exposes totals.messages and by_type', () => {
    let totals: any;
    service.GET_reminderCampaignPreview(7).subscribe(res => (totals = res.response.totals));
    http.expectOne(`${base}/7/preview`).flush({
      response: { digests: [], unreachable: [], totals: { messages: 2, results: 3, cc_addresses: 0, by_type: { DEVELOPER: { messages: 2, results: 3 } } } }
    });
    expect(totals.messages).toBe(2);
    expect(totals.by_type.DEVELOPER.results).toBe(3);
  });
});
