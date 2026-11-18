// @akili-spec changes/rir-center-focal-routing (RCF-T-4): wiring of the Center focal points section
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { ResultsApiService } from '../../../../../../shared/services/api/results-api.service';
import { CenterRoutingView } from '../../../../../../shared/interfaces/replicated-innovation-reminders.interface';
import { CenterFocalPointsComponent } from './center-focal-points.component';

const centers = (): CenterRoutingView[] => [
  {
    code: 'CENTER-05',
    acronym: 'ICARDA',
    name: 'International Center for Agricultural Research in the Dry Areas',
    route_all_to_center: false,
    contacts: [{ id: 1, name: 'Enrico', email: 'enrico@x.org', is_active: true }]
  },
  { code: 'CENTER-17', acronym: 'SMO', name: null, route_all_to_center: false, contacts: [] }
];

describe('CenterFocalPointsComponent', () => {
  let fixture: ComponentFixture<CenterFocalPointsComponent>;
  let api: Record<string, jest.Mock>;

  const root = () => fixture.nativeElement as HTMLElement;
  const q = <T extends HTMLElement = HTMLElement>(id: string) => root().querySelector(`[data-testid="${id}"]`) as T | null;
  const click = (id: string) => {
    (q(id) as HTMLElement).click();
    fixture.detectChanges();
  };
  const type = (id: string, value: string) => {
    const el = q<HTMLInputElement>(id) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  async function setup(list: any = of({ response: centers() })) {
    api = {
      GET_centerFocalPoints: jest.fn().mockReturnValue(list),
      POST_centerFocalPoint: jest.fn().mockReturnValue(of({ response: { id: 9, name: 'Joren', email: 'joren@x.org', is_active: true } })),
      PATCH_centerFocalPoint: jest.fn().mockReturnValue(of({ response: { id: 1, name: 'Enrico', email: 'enrico@x.org', is_active: false } })),
      PATCH_centerRouting: jest.fn().mockReturnValue(of({ response: { center_code: 'CENTER-17', route_all_to_center: true, active_contacts: 0, warning: null } }))
    };
    await TestBed.configureTestingModule({
      imports: [CenterFocalPointsComponent],
      providers: [
        { provide: ResultsApiService, useValue: api },
        { provide: BrnDialogRef, useValue: new BrnDialogRef() }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CenterFocalPointsComponent);
    fixture.detectChanges();
  }

  /** Clicks the rendered switch of a Center row: the real template wiring (click -> toggleRouting). */
  const toggle = (code: string) => {
    q<HTMLButtonElement>(`cfp-optin-${code}`)!.click();
    fixture.detectChanges();
  };

  it('shows a loading skeleton until the list arrives', async () => {
    await setup(new Subject());
    expect(q('cfp-loading')).not.toBeNull();
    expect(q('cfp-table')).toBeNull();
  });

  it('shows an error with the server message and retries', async () => {
    await setup(throwError(() => ({ error: { message: 'Boom' } })));
    expect(q('cfp-load-error')?.textContent).toContain('Boom');
    api['GET_centerFocalPoints'].mockReturnValue(of({ response: centers() }));
    (q('cfp-load-error')!.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(q('cfp-table')).not.toBeNull();
  });

  it('renders one row per Center with active contacts and an empty note', async () => {
    await setup();
    expect(q('cfp-row-CENTER-05')?.textContent).toContain('ICARDA');
    expect(q('cfp-contacts-CENTER-05')?.textContent).toContain('Enrico');
    expect(q('cfp-contacts-CENTER-17')?.textContent).toContain('No focal point');
  });

  it('renders an empty state when there are no Centers', async () => {
    await setup(of({ response: [] }));
    expect(q('cfp-empty')).not.toBeNull();
  });

  it('the opt-in toggle calls PATCH_centerRouting with the code exactly as returned', async () => {
    await setup();
    toggle('CENTER-17');
    expect(api['PATCH_centerRouting']).toHaveBeenCalledWith('CENTER-17', { route_all_to_center: true });
    expect(fixture.componentInstance.centers().find(c => c.code === 'CENTER-17')!.route_all_to_center).toBe(true);
    expect(q('cfp-warning-CENTER-17')).toBeNull();
  });

  it('shows the server warning when the opt-in is on with no active contact', async () => {
    await setup();
    api['PATCH_centerRouting'].mockReturnValue(
      of({ response: { center_code: 'CENTER-17', route_all_to_center: true, active_contacts: 0, warning: 'SMO-led results will be unreachable' } })
    );
    toggle('CENTER-17');
    expect(q('cfp-warning-CENTER-17')?.textContent).toContain('SMO-led results will be unreachable');
  });

  it('rolls the opt-in back and shows the error when the server refuses it', async () => {
    await setup();
    api['PATCH_centerRouting'].mockReturnValue(throwError(() => ({ error: { message: 'Not allowed' } })));
    toggle('CENTER-17');
    expect(fixture.componentInstance.centers().find(c => c.code === 'CENTER-17')!.route_all_to_center).toBe(false);
    expect(q('cfp-row-error-CENTER-17')?.textContent).toContain('Not allowed');
  });

  it('adds a contact from the dialog and lists it', async () => {
    await setup();
    click('cfp-edit-CENTER-05');
    type('cfp-form-name', 'Joren');
    type('cfp-form-email', 'joren@x.org');
    click('cfp-form-submit');
    expect(api['POST_centerFocalPoint']).toHaveBeenCalledWith({ center_code: 'CENTER-05', name: 'Joren', email: 'joren@x.org' });
    expect(q('cfp-contact-9')).not.toBeNull();
  });

  it('shows a 409 from the server inline and keeps the form', async () => {
    await setup();
    api['POST_centerFocalPoint'].mockReturnValue(throwError(() => ({ error: { message: 'Already exists. Reactivate it instead.' } })));
    click('cfp-edit-CENTER-05');
    type('cfp-form-email', 'enrico@x.org');
    click('cfp-form-submit');
    expect(q('cfp-form-error')?.textContent).toContain('Already exists. Reactivate it instead.');
    expect(q<HTMLInputElement>('cfp-form-email')!.value).toBe('enrico@x.org');
  });

  it('rejects an empty email without calling the server', async () => {
    await setup();
    click('cfp-edit-CENTER-05');
    click('cfp-form-submit');
    expect(api['POST_centerFocalPoint']).not.toHaveBeenCalled();
    expect(q('cfp-form-error')?.textContent).toContain('Enter an email address.');
  });

  it('deactivates a contact with is_active false and updates the row', async () => {
    await setup();
    click('cfp-edit-CENTER-05');
    click('cfp-contact-toggle-1');
    expect(api['PATCH_centerFocalPoint']).toHaveBeenCalledWith(1, { is_active: false });
    expect(q('cfp-contact-1')?.textContent).toContain('Inactive');
  });

  it('edits a contact with PATCH_centerFocalPoint', async () => {
    await setup();
    click('cfp-edit-CENTER-05');
    click('cfp-contact-edit-1');
    expect(q<HTMLInputElement>('cfp-form-email')!.value).toBe('enrico@x.org');
    type('cfp-form-email', 'e2@x.org');
    click('cfp-form-submit');
    expect(api['PATCH_centerFocalPoint']).toHaveBeenCalledWith(1, { name: 'Enrico', email: 'e2@x.org' });
  });

  describe('missingCount output (ARP-T-1)', () => {
    const track = () => {
      const seen: number[] = [];
      fixture.componentInstance.missingCount.subscribe(n => seen.push(n));
      return seen;
    };

    it('emits the number of Centers without an active contact after a successful load', async () => {
      await setup(new Subject());
      const seen = track();
      expect(seen).toEqual([]);
      fixture.componentInstance.centers.set([]);
      (api['GET_centerFocalPoints'].mock.results[0].value as Subject<unknown>).next({ response: centers() });
      expect(seen).toEqual([1]);
    });

    it('never emits when the load fails', async () => {
      await setup(throwError(() => ({ error: { message: 'Boom' } })));
      const seen = track();
      fixture.componentInstance.load(); // a failed retry too
      fixture.detectChanges();
      expect(seen).toEqual([]);
    });

    it('re-emits after a contacts change that fixes a Center', async () => {
      await setup();
      const seen = track();
      click('cfp-edit-CENTER-17');
      type('cfp-form-email', 'new@x.org');
      click('cfp-form-submit');
      expect(seen).toEqual([0]);
    });
  });

  describe('toolbar, rows and switch (ARP-T-4)', () => {
    const contact = (id: number, email: string, is_active = true, name: string | null = null) => ({ id, name, email, is_active });
    /** A 2 active; B none; C only an inactive contact (mandatory: tells active from any); D opted in; E potato. */
    const fiveCenters = (): CenterRoutingView[] => [
      { code: 'A', acronym: 'AAA', name: 'Alpha Center', route_all_to_center: false, contacts: [contact(1, 'a1@x.org', true, 'Ann One'), contact(2, 'a2@x.org')] },
      { code: 'B', acronym: 'BBB', name: 'Beta Center', route_all_to_center: false, contacts: [] },
      { code: 'C', acronym: 'CCC', name: 'Gamma Center', route_all_to_center: false, contacts: [contact(3, 'c1@x.org', false)] },
      { code: 'D', acronym: 'DDD', name: 'Delta Center', route_all_to_center: true, contacts: [contact(4, 'd1@x.org')] },
      { code: 'E', acronym: 'CIP', name: 'International Potato Center', route_all_to_center: false, contacts: [contact(5, 'alessandra@x.org', true, 'Alessandra R')] }
    ];
    const rows = () => Array.from(root().querySelectorAll('[data-testid^="cfp-row-"]')).map(r => r.getAttribute('data-testid'));
    const count = (k: string) => q(`arp-fp-count-${k}`)!.textContent!.trim();

    beforeEach(async () => {
      await setup(of({ response: fiveCenters() }));
    });

    it('chips show all 5, missing 2 (B and C) and opt-in 1 (D)', () => {
      expect([count('all'), count('missing'), count('optin')]).toEqual(['5', '2', '1']);
    });

    it('the missing chip counts only ACTIVE contacts (C has an inactive one) and filters to B and C', () => {
      click('arp-fp-chip-missing');
      expect(rows()).toEqual(['cfp-row-B', 'cfp-row-C']);
      click('arp-fp-chip-optin');
      expect(rows()).toEqual(['cfp-row-D']);
      click('arp-fp-chip-all');
      expect(rows().length).toBe(5);
    });

    it('search is case-insensitive over name and contact email', () => {
      type('arp-fp-search', 'potato');
      expect(rows()).toEqual(['cfp-row-E']);
      type('arp-fp-search', 'ALESSANDRA');
      expect(rows()).toEqual(['cfp-row-E']);
      type('arp-fp-search', 'bbb');
      expect(rows()).toEqual(['cfp-row-B']);
    });

    it('search combines with the chip and shows "No Centers match" when nothing is left', () => {
      click('arp-fp-chip-missing');
      type('arp-fp-search', 'potato');
      expect(rows()).toEqual([]);
      expect(q('arp-fp-no-match')?.textContent).toContain('No Centers match');
    });

    it('rows show active contacts as chips with initials and a warning badge + Add contact when none is active', () => {
      expect(q('arp-fp-initials-1')?.textContent?.trim()).toBe('AO');
      expect(q('cfp-contacts-A')?.textContent).toContain('Ann One');
      expect(q('arp-fp-missing-B')?.textContent).toContain('No focal point');
      expect(q('arp-fp-missing-C')?.textContent).toContain('No focal point');
      expect(q('arp-fp-add-C')).not.toBeNull();
      expect(q('arp-fp-add-A')).toBeNull();
      expect(q('cfp-edit-A')).not.toBeNull();
    });

    it('Add contact on B opens the contacts dialog for B', () => {
      click('arp-fp-add-B');
      expect(fixture.componentInstance.dialogCenter()?.code).toBe('B');
      expect(q('cfp-dialog')?.textContent).toContain('BBB');
    });

    it('emits missingCount 2 after load, 1 after reactivating the inactive contact of C, and nothing on a load error', async () => {
      const seen: number[] = [];
      fixture.componentInstance.missingCount.subscribe(n => seen.push(n));
      fixture.componentInstance.load();
      expect(seen).toEqual([2]);
      api['PATCH_centerFocalPoint'].mockReturnValue(of({ response: contact(3, 'c1@x.org', true) }));
      click('cfp-edit-C');
      click('cfp-contact-toggle-3');
      expect(seen).toEqual([2, 1]);
      api['GET_centerFocalPoints'].mockReturnValue(throwError(() => ({ error: { message: 'Boom' } })));
      fixture.componentInstance.load();
      expect(seen).toEqual([2, 1]);
    });

    it('the switch is a keyboard-operable role=switch button; click sends one PATCH and aria-checked flips with On text and live message', () => {
      const sw = q<HTMLButtonElement>('cfp-optin-B')!;
      expect(sw.tagName).toBe('BUTTON');
      expect(sw.getAttribute('role')).toBe('switch');
      expect(sw.getAttribute('aria-checked')).toBe('false');
      expect(q('arp-fp-switch-text-B')?.textContent?.trim()).toBe('Off');
      api['PATCH_centerRouting'].mockReturnValue(of({ response: { center_code: 'B', route_all_to_center: true, active_contacts: 0, warning: null } }));
      toggle('B');
      expect(api['PATCH_centerRouting']).toHaveBeenCalledTimes(1);
      expect(api['PATCH_centerRouting']).toHaveBeenCalledWith('B', { route_all_to_center: true });
      expect(q('cfp-optin-B')!.getAttribute('aria-checked')).toBe('true');
      expect(q('arp-fp-switch-text-B')?.textContent?.trim()).toBe('On');
      expect(q('arp-fp-live')?.textContent).toContain('BBB now receives all reminders');
    });

    it('on a PATCH error the switch returns to its previous state and the row error shows', () => {
      api['PATCH_centerRouting'].mockReturnValue(throwError(() => ({ error: { message: 'Not allowed' } })));
      toggle('B');
      expect(q('cfp-optin-B')!.getAttribute('aria-checked')).toBe('false');
      expect(q('arp-fp-switch-text-B')?.textContent?.trim()).toBe('Off');
      expect(q('cfp-row-error-B')?.textContent).toContain('Not allowed');
      expect(q('arp-fp-live')?.textContent).toContain('Not allowed');
    });
  });
});
