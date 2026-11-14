// @akili-spec changes/rir-center-focal-routing (RCF-T-4): wiring of the Center focal points section
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { ResultsApiService } from '../../../../../../../shared/services/api/results-api.service';
import { CenterRoutingView } from '../../../../../../../shared/interfaces/replicated-innovation-reminders.interface';
import { CenterFocalPointsComponent } from './center-focal-points.component';

/**
 * Jest replaces `@spartan-ng/brain/*` with a mock that has no BrnCheckbox, so the real `hlm-checkbox`
 * cannot be compiled here. This stand-in keeps the contract the template uses (`aria-label`, `checked`,
 * `disabled`, `checkedChange`) as a role=checkbox button.
 */
jest.mock('@spartan/checkbox', () => {
  const { Component, EventEmitter } = jest.requireActual('@angular/core');
  class HlmCheckboxStub {
    ariaLabel = '';
    checked = false;
    disabled = false;
    checkedChange = new EventEmitter();
  }
  Component({
    selector: 'hlm-checkbox',
    inputs: ['checked', 'disabled', { name: 'ariaLabel', alias: 'aria-label' }],
    outputs: ['checkedChange'],
    template: `<button type="button" role="checkbox" [attr.aria-label]="ariaLabel" [attr.aria-checked]="checked" (click)="checkedChange.emit(!checked)"></button>`
  })(HlmCheckboxStub);
  return { HlmCheckboxImports: [HlmCheckboxStub] };
});

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

  /** Clicks the rendered checkbox of a Center row: the real template wiring (checkedChange -> toggleRouting). */
  const toggle = (code: string) => {
    (q(`cfp-optin-${code}`)!.querySelector('button[role="checkbox"]') as HTMLButtonElement).click();
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
});
