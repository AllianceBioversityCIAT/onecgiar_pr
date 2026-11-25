import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { StepN3CurrentUseComponent } from './step-n3-current-use.component';
import { ActorN3, IpsrStep3Body, MeasureN3, OrganizationN3 } from '../../model/Ipsr-step-3-body.model';
import { buildIpsrStep3SavePayload } from '../ipsr-step3-evidence-list/ipsr-step3-evidence.util';
import { CURRENT_USE_UPDATE_COPY } from '../../../../../../../../../../internationalization/current-use-update.copy';

/**
 * IU26-T-14 / IU26-R-13 — IPSR step 3 "Current use of the core innovation" on 2026+ packages:
 * 2026 copy, previous-use reference, totals tiles (no Households), one NEW input per row (<= total), no narrative.
 * A 2025 package keeps today's copy.
 */
describe('StepN3CurrentUseComponent — IU26', () => {
  let fixture: ComponentFixture<StepN3CurrentUseComponent>;
  let component: StepN3CurrentUseComponent;
  const el = () => fixture.nativeElement as HTMLElement;
  const headersOf = () =>
    Array.from(el().querySelectorAll('app-pr-field-header'))
      .map(h => (h as any).label ?? h.getAttribute('label'))
      .join('|');
  const q = (id: string) => el().querySelector(`[data-testid="${id}"]`);

  const buildBody = (): IpsrStep3Body => {
    const body = new IpsrStep3Body();
    const actor = Object.assign(new ActorN3(), { result_ip_actors_id: 1, actor_type_id: 1, sex_and_age_disaggregation: true, how_many: 100, new_users: 30 });
    const org = Object.assign(new OrganizationN3(), { id: 2, institution_types_id: 3, how_many: 5 });
    const measure = Object.assign(new MeasureN3(), { result_ip_result_measures_id: 3, unit_of_measure: 'Hectares', quantity: 40 });
    body.innovatonUse = { actors: [actor], organization: [org], measures: [measure] };
    body.current_use_previous = { result_id: 1, phase_year: 2025, total_actors: 80, total_organizations: 4, measures: [{ unit: 'Hectares', quantity: 30 }] };
    return body;
  };

  const setup = (phaseYear: number | null, body = buildBody()) => {
    fixture = TestBed.createComponent(StepN3CurrentUseComponent);
    component = fixture.componentInstance;
    component.api.dataControlSE.currentResultSignal.set(phaseYear === null ? ({} as any) : ({ portfolio: 'P25', phase_year: phaseYear } as any));
    jest.spyOn(component.api.resultsSE, 'GETAllActorsTypes').mockReturnValue(of({ response: [] }) as any);
    jest.spyOn(component.api.resultsSE, 'GETInstitutionsTypeTree').mockReturnValue(of({ response: [] }) as any);
    component.body = body;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StepN3CurrentUseComponent],
      imports: [HttpClientTestingModule, CommonModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  describe('2026 package', () => {
    beforeEach(() => setup(2026));

    it('shows the 2026 question and not the 2025 one', () => {
      const headers = Array.from(el().querySelectorAll('app-pr-field-header')).map(h => (h as any).label ?? h.getAttribute('label'));
      expect(headers).toContain(CURRENT_USE_UPDATE_COPY.question2026(2026));
      expect(headers.join('|')).not.toContain('Specify the current use of the core innovation');
    });

    it('drops "expected" from the actors description', () => {
      expect(component.narrativeActors()).not.toMatch(/expected/i);
    });

    it('shows the previous reported use by category as reference', () => {
      const block = q('iu-previous-use');
      expect(block).toBeTruthy();
      expect(block.textContent).toContain('Previous reported use (FY2025');
      expect(q('iu-previous-actors').textContent).toContain('80');
      expect(q('iu-previous-organizations').textContent).toContain('4');
      expect(q('iu-previous-measures').textContent).toContain('Hectares');
    });

    it('shows totals tiles without a Households tile', () => {
      expect(q('iu-totals')).toBeTruthy();
      expect(q('iu-total-actors-individuals').textContent).toContain('100');
      expect(q('iu-total-organizations').textContent).toContain('5');
      expect(q('iu-total-measures').textContent).toContain('40');
      expect(q('iu-total-households')).toBeNull();
    });

    it('renders the total labels and one NEW input per row', () => {
      const labels = Array.from(el().querySelectorAll('app-pr-input')).map(i => (i as any).label);
      expect(labels).toContain(CURRENT_USE_UPDATE_COPY.howManyTotalLabel);
      expect(labels).toContain(CURRENT_USE_UPDATE_COPY.quantityTotalLabel);
      expect(el().querySelectorAll('[data-testid="iu-new-input"]').length).toBe(3);
    });

    it('has no narrative field and no Households control', () => {
      expect(el().querySelector('app-pr-textarea')).toBeNull();
      expect(el().innerHTML).not.toContain('Households');
    });

    it('flags NEW above the row total, accepts equal / blank / 0', () => {
      const actor = component.body.innovatonUse.actors[0];
      actor.new_users = 101;
      expect(component.newUsersExceeds(actor, 'actor')).toBe(true);
      actor.new_users = 100;
      expect(component.newUsersExceeds(actor, 'actor')).toBe(false);
      actor.new_users = null;
      expect(component.newUsersExceeds(actor, 'actor')).toBe(false);
      actor.new_users = 0;
      expect(component.newUsersExceeds(actor, 'actor')).toBe(false);
      const org = component.body.innovatonUse.organization[0];
      org.new_users = 6;
      expect(component.newUsersExceeds(org, 'organization')).toBe(true);
      const measure = component.body.innovatonUse.measures[0];
      measure.new_users = 41;
      expect(component.newUsersExceeds(measure, 'measure')).toBe(true);
    });

    it('shows the exceeds message in the DOM', () => {
      component.body.innovatonUse.actors[0].new_users = 150;
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(q('iu-new-error')?.textContent).toContain(CURRENT_USE_UPDATE_COPY.newUsersExceeds(150, 100));
    });

    it('marks the over-total NEW input invalid and links it to its message', () => {
      const inputs = () => Array.from(el().querySelectorAll('[data-testid="iu-new-input"]')) as any[];
      expect(inputs().every(i => i.markInvalid === false)).toBe(true);
      component.body.innovatonUse.organization[0].new_users = 9;
      component.body.innovatonUse.measures[0].new_users = 99;
      component.body.innovatonUse.actors[0].new_users = 101;
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      const [actor, org, measure] = inputs();
      expect(actor.markInvalid).toBe(true);
      expect(actor.describedBy).toBe('iu-new-error-actor-0');
      expect(org.describedBy).toBe('iu-new-error-organization-0');
      expect(measure.describedBy).toBe('iu-new-error-measure-0');
      expect(el().querySelector('#iu-new-error-actor-0')?.getAttribute('role')).toBe('alert');
      expect(component.anyNewUsersExceeds()).toBe(true);
    });

    it('blank NEW input is normalised to null (never undefined / empty string)', () => {
      const actor = component.body.innovatonUse.actors[0];
      component.setNewUsers(actor, '');
      expect(actor.new_users).toBeNull();
      component.setNewUsers(actor, '12');
      expect(actor.new_users).toBe(12);
    });
  });

  describe('2025 package (falsifier)', () => {
    beforeEach(() => setup(2025));

    it("keeps today's copy with 'expected' and none of the 2026 UI", () => {
      expect(headersOf()).toContain('Specify the current use of the core innovation');
      expect(component.narrativeActors()).toMatch(/expected/);
      expect(q('iu-previous-use')).toBeNull();
      expect(q('iu-totals')).toBeNull();
      expect(el().querySelectorAll('[data-testid="iu-new-input"]').length).toBe(0);
    });
  });

  it('fails open to the 2025 behaviour when the phase year is not populated', () => {
    setup(null);
    expect(component.isIu2026()).toBe(false);
    expect(headersOf()).toContain('Specify the current use of the core innovation');
  });

  describe('new_users is always sent', () => {
    it('the save payload carries new_users (value or null) on every row, keeps loaded values and drops current_use_previous', () => {
      const body = buildBody();
      // rows as the loader hands them: plain objects, one without the key
      body.innovatonUse.organization = [{ id: 2, how_many: 5 } as any];
      body.innovatonUse.measures = [{ unit_of_measure: 'ha', quantity: 1, new_users: 0 } as any];
      const payload: any = buildIpsrStep3SavePayload(body);
      expect(payload.innovatonUse.actors[0].new_users).toBe(30);
      expect(payload.innovatonUse.organization[0]).toHaveProperty('new_users', null);
      expect(payload.innovatonUse.measures[0].new_users).toBe(0);
      expect(payload).not.toHaveProperty('current_use_previous');
      expect(body.innovatonUse.organization[0]).not.toHaveProperty('new_users');
    });
  });
});
