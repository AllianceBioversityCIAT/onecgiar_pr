// @akili-spec changes/replicated-innovation-reminders (RIR-T-6)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { By } from '@angular/platform-browser';
import { BrnButton } from '@spartan-ng/brain/button';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { ReminderCampaignList, ReminderCampaignView } from '../../../../../../shared/interfaces/replicated-innovation-reminders.interface';
import { REMINDER_TZ_OFFSET_MINUTES, ReplicatedInnovationRemindersComponent } from './replicated-innovation-reminders.component';

const campaign = (over: Partial<ReminderCampaignView> = {}): ReminderCampaignView => ({
  id: 1,
  version_id: 36,
  kind: 'Q4_NOTICE',
  scheduled_at: '2099-01-10T12:00:00.000Z',
  status: 'PENDING',
  claimed_at: null,
  sent_at: null,
  sent_count: 0,
  skipped_count: 0,
  failed_count: 0,
  unreachable_count: 0,
  last_error: null,
  ...over
});

const list = (campaigns: ReminderCampaignView[]): { response: ReminderCampaignList } => ({
  response: { phase: { id: 36, phase_name: 'Reporting 2026', phase_year: 2026 }, campaigns, pending_total: 4, unreachable_total: 1 }
});

describe('ReplicatedInnovationRemindersComponent', () => {
  let fixture: ComponentFixture<ReplicatedInnovationRemindersComponent>;
  let component: ReplicatedInnovationRemindersComponent;
  let api: Record<string, jest.Mock>;

  const root = () => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(testId: string) => root().querySelector(`[data-testid="${testId}"]`) as T | null;
  /** hlmBtn forwards `disabled` to BrnButton (the Jest stub keeps it as an input only), so read both. */
  const isDisabled = (testId: string): boolean => {
    const de = fixture.debugElement.query(By.css(`[data-testid="${testId}"]`));
    const el = de.nativeElement as HTMLButtonElement;
    const brn = de.injector.get(BrnButton, null) as { disabled?: unknown } | null;
    const flag = brn?.disabled;
    return el.disabled || el.hasAttribute('disabled') || (flag !== undefined && flag !== null && flag !== false && flag !== 'false');
  };
  const click = (testId: string) => {
    (q(testId) as HTMLButtonElement).click();
    fixture.detectChanges();
  };
  const type = (testId: string, value: string) => {
    const el = q<HTMLInputElement>(testId) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  async function setup(listResponse: any = of(list([])), offsetAt: (at: Date) => number = () => 300) {
    api = {
      GET_reminderCampaigns: jest.fn().mockReturnValue(listResponse),
      POST_reminderCampaign: jest.fn().mockReturnValue(of({ response: campaign() })),
      PATCH_reminderCampaignDate: jest.fn().mockReturnValue(of({ response: campaign() })),
      PATCH_reminderCampaignCancel: jest.fn().mockReturnValue(of({ response: campaign({ status: 'CANCELLED' }) })),
      GET_reminderCampaignPreview: jest
        .fn()
        .mockReturnValue(
          of({ response: { digests: [{ to: 'a@x.org', cc: [], results: [] }], totals: { leads: 3, results: 5, cc_addresses: 1 }, unreachable: [] } })
        ),
      POST_reminderCampaignSend: jest.fn().mockReturnValue(of({ response: { status: 'SENT', sent: 3, skipped: 0, failed: 0, unreachable: 0 } }))
    };
    await TestBed.configureTestingModule({
      imports: [ReplicatedInnovationRemindersComponent],
      providers: [
        { provide: ResultsApiService, useValue: api },
        { provide: BrnDialogRef, useValue: new BrnDialogRef() },
        // UTC-5 -> getTimezoneOffset() = +300, so the test never depends on the machine zone.
        { provide: REMINDER_TZ_OFFSET_MINUTES, useValue: offsetAt }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ReplicatedInnovationRemindersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('shows a loading state until the list arrives', async () => {
    await setup(new Subject());
    expect(q('rir-loading')).not.toBeNull();
    expect(q('rir-empty')).toBeNull();
  });

  it('renders the empty state for an empty list', async () => {
    await setup(of(list([])));
    expect(q('rir-empty')?.textContent).toContain('No campaigns scheduled for this phase');
    expect(q('rir-table')).toBeNull();
    // both kinds are missing, so both schedule forms render
    expect(q('rir-schedule-Q4_NOTICE')).not.toBeNull();
    expect(q('rir-schedule-FINAL_REMINDER')).not.toBeNull();
  });

  it('renders an error state with the server message and a retry', async () => {
    await setup(throwError(() => ({ error: { message: 'There is no active Reporting phase' } })));
    expect(q('rir-load-error')?.textContent).toContain('There is no active Reporting phase');
    api['GET_reminderCampaigns'].mockReturnValue(of(list([])));
    (q('rir-load-error')!.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(q('rir-load-error')).toBeNull();
  });

  it('renders status badge and counts per row', async () => {
    await setup(of(list([campaign({ status: 'SENT', sent_count: 9, skipped_count: 2, failed_count: 1, unreachable_count: 3 })])));
    const row = q('rir-row-1')!;
    expect(row.querySelector('[data-testid="rir-status"]')?.textContent).toContain('Sent');
    expect(row.textContent).toMatch(/9\s*2\s*1\s*3/);
  });

  it('disables Send now and Cancel on a SENDING row', async () => {
    await setup(of(list([campaign({ status: 'SENDING' })])));
    expect(isDisabled('rir-send-btn')).toBe(true);
    expect(isDisabled('rir-cancel-btn')).toBe(true);
    expect(isDisabled('rir-edit-btn')).toBe(true);
  });

  it('enables the actions on a PENDING row', async () => {
    await setup(of(list([campaign()])));
    expect(isDisabled('rir-send-btn')).toBe(false);
    expect(isDisabled('rir-cancel-btn')).toBe(false);
  });

  it('only offers the kind that is missing (a CANCELLED campaign does not count)', async () => {
    await setup(of(list([campaign({ kind: 'Q4_NOTICE' }), campaign({ id: 2, kind: 'FINAL_REMINDER', status: 'CANCELLED' })])));
    expect(q('rir-schedule-Q4_NOTICE')).toBeNull();
    expect(q('rir-schedule-FINAL_REMINDER')).not.toBeNull();
  });

  it('POSTs local 2026-11-15T08:00 in UTC-5 as 2026-11-15T13:00:00.000Z', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T00:00:00Z'));
    try {
      await setup(of(list([])));
      type('rir-draft-Q4_NOTICE', '2026-11-15T08:00');
      click('rir-submit-Q4_NOTICE');
      expect(api['POST_reminderCampaign']).toHaveBeenCalledWith({ kind: 'Q4_NOTICE', scheduled_at: '2026-11-15T13:00:00.000Z' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('labels the time zone next to the schedule form', async () => {
    await setup(of(list([])));
    expect(q('rir-tz-hint-Q4_NOTICE')?.textContent).toContain('UTC-05:00');
  });

  it('rejects a past date without calling the API', async () => {
    await setup(of(list([])));
    type('rir-draft-Q4_NOTICE', '2001-01-01T08:00');
    click('rir-submit-Q4_NOTICE');
    expect(api['POST_reminderCampaign']).not.toHaveBeenCalled();
    expect(root().textContent).toContain('The date must be in the future.');
  });

  it('disables the Schedule submit while the request is in flight and ignores a second submit', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T00:00:00Z'));
    try {
      await setup(of(list([])));
      const inflight = new Subject<any>();
      api['POST_reminderCampaign'].mockReturnValue(inflight);
      type('rir-draft-Q4_NOTICE', '2026-11-15T08:00');
      click('rir-submit-Q4_NOTICE');
      expect(isDisabled('rir-submit-Q4_NOTICE')).toBe(true);
      expect(isDisabled('rir-submit-FINAL_REMINDER')).toBe(true);
      component.schedule('Q4_NOTICE');
      expect(api['POST_reminderCampaign']).toHaveBeenCalledTimes(1);
      inflight.next({ response: campaign() });
      inflight.complete();
      fixture.detectChanges();
      expect(component.busy()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the server message when a mutation is refused (409)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T00:00:00Z'));
    try {
      await setup(of(list([])));
      api['POST_reminderCampaign'].mockReturnValue(throwError(() => ({ status: 409, error: { message: 'A Q4_NOTICE campaign already exists' } })));
      type('rir-draft-Q4_NOTICE', '2026-11-15T08:00');
      click('rir-submit-Q4_NOTICE');
      expect(q('rir-action-error')?.textContent).toContain('A Q4_NOTICE campaign already exists');
    } finally {
      jest.useRealTimers();
    }
  });

  it('Send now asks for confirmation that states the preview lead count, and sends only after confirming', async () => {
    await setup(of(list([campaign()])));
    click('rir-send-btn');
    expect(api['GET_reminderCampaignPreview']).toHaveBeenCalledWith(1);
    expect(api['POST_reminderCampaignSend']).not.toHaveBeenCalled();
    expect(q('rir-confirm-text')?.textContent).toContain('3 leads will receive an email');
    click('rir-confirm-send');
    expect(api['POST_reminderCampaignSend']).toHaveBeenCalledTimes(1);
    expect(api['POST_reminderCampaignSend']).toHaveBeenCalledWith(1);
    expect(q('rir-outcome')?.textContent).toContain('3 sent');
  });

  it('disables the confirm button while the send is in flight (no double send)', async () => {
    await setup(of(list([campaign()])));
    click('rir-send-btn');
    api['POST_reminderCampaignSend'].mockReturnValue(new Subject());
    click('rir-confirm-send');
    expect(isDisabled('rir-confirm-send')).toBe(true);
    component.confirmSend();
    expect(api['POST_reminderCampaignSend']).toHaveBeenCalledTimes(1);
  });

  it('closing the confirm dialog does not send', async () => {
    await setup(of(list([campaign()])));
    click('rir-send-btn');
    component.dismissConfirm();
    fixture.detectChanges();
    expect(q('rir-confirm-text')).toBeNull();
    expect(api['POST_reminderCampaignSend']).not.toHaveBeenCalled();
  });

  it('Cancel PATCHes the cancel endpoint and reloads', async () => {
    await setup(of(list([campaign()])));
    click('rir-cancel-btn');
    expect(api['PATCH_reminderCampaignCancel']).toHaveBeenCalledWith(1);
    expect(api['GET_reminderCampaigns']).toHaveBeenCalledTimes(2);
  });

  it('Edit date prefills local time and PATCHes the new UTC instant', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T00:00:00Z'));
    try {
      await setup(of(list([campaign({ scheduled_at: '2026-12-01T14:00:00.000Z' })])));
      click('rir-edit-btn');
      expect((q('rir-edit-input') as HTMLInputElement).value).toBe('2026-12-01T09:00');
      type('rir-edit-input', '2026-12-02T10:00');
      click('rir-edit-save');
      expect(api['PATCH_reminderCampaignDate']).toHaveBeenCalledWith(1, { scheduled_at: '2026-12-02T15:00:00.000Z' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('Preview opens the sheet and shows digests, unreachable table and the redirect banner', async () => {
    await setup(of(list([campaign()])));
    api['GET_reminderCampaignPreview'].mockReturnValue(
      of({
        response: {
          digests: [
            {
              to: 'lead@example.org',
              cc: ['cc@example.org'],
              results: [{ result_id: 1, result_code: 10, title: 'Maize', initiative_code: 'INIT-01' }]
            }
          ],
          totals: { leads: 1, results: 1, cc_addresses: 1 },
          unreachable: [{ result_id: 2, result_code: 11, title: 'Beans', initiative_code: 'INIT-02' }],
          redirected_to: 'test@example.org'
        }
      })
    );
    click('rir-preview-btn');
    expect(api['GET_reminderCampaignPreview']).toHaveBeenCalledWith(1);
    expect(q('rir-redirect-banner')).not.toBeNull();
    expect(q('rir-digest')?.textContent).toContain('Maize');
    expect(q('rir-unreachable-table')?.textContent).toContain('Beans');
  });

  it('Preview shows no redirect banner in production responses', async () => {
    await setup(of(list([campaign()])));
    click('rir-preview-btn');
    expect(q('rir-redirect-banner')).toBeNull();
  });

  it('uses the offset of the entered date across a DST change (POST, label, edit prefill)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T00:00:00Z'));
    try {
      // Rome: UTC+2 before 2026-10-25T01:00Z, UTC+1 after (getTimezoneOffset semantics: -120 / -60).
      const rome = (at: Date) => (at.getTime() < Date.parse('2026-10-25T01:00:00Z') ? -120 : -60);
      await setup(of(list([campaign({ id: 5, kind: 'FINAL_REMINDER', scheduled_at: '2026-11-15T08:00:00.000Z' })])), rome);
      type('rir-draft-Q4_NOTICE', '2026-11-15T09:00');
      expect(q('rir-tz-hint-Q4_NOTICE')?.textContent).toContain('UTC+01:00');
      type('rir-draft-Q4_NOTICE', '2026-10-19T09:00');
      expect(q('rir-tz-hint-Q4_NOTICE')?.textContent).toContain('UTC+02:00');
      type('rir-draft-Q4_NOTICE', '2026-11-15T09:00');
      click('rir-submit-Q4_NOTICE');
      expect(api['POST_reminderCampaign']).toHaveBeenCalledWith({ kind: 'Q4_NOTICE', scheduled_at: '2026-11-15T08:00:00.000Z' });
      click('rir-edit-btn');
      expect((q('rir-edit-input') as HTMLInputElement).value).toBe('2026-11-15T09:00');
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the sent-at date, or a dash when the campaign was not sent', async () => {
    await setup(of(list([campaign({ id: 1, status: 'SENT', sent_at: '2026-10-20T10:00:00.000Z' }), campaign({ id: 2, kind: 'FINAL_REMINDER' })])));
    const cells = root().querySelectorAll('[data-testid="rir-sent-at"]');
    expect(cells[0].textContent?.trim()).not.toBe('-');
    expect(cells[0].textContent).toMatch(/2026/);
    expect(cells[1].textContent?.trim()).toBe('-');
  });

  it('shows the free-text contact of each unreachable row, or a dash', async () => {
    await setup(of(list([campaign()])));
    api['GET_reminderCampaignPreview'].mockReturnValue(
      of({
        response: {
          digests: [],
          totals: { leads: 0, results: 0, cc_addresses: 0 },
          unreachable: [
            { result_id: 2, result_code: 11, title: 'Beans', initiative_code: 'INIT-02', lead_contact_person: 'Jane Doe (jane at example)' },
            { result_id: 3, result_code: 12, title: 'Rice', initiative_code: 'INIT-03', lead_contact_person: null }
          ]
        }
      })
    );
    click('rir-preview-btn');
    const cells = root().querySelectorAll('[data-testid="rir-unreachable-contact"]');
    expect(cells[0].textContent).toContain('Jane Doe (jane at example)');
    expect(cells[1].textContent?.trim()).toBe('-');
  });
});
