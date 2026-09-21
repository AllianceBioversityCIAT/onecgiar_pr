import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';

import { IpsrSubmitProgressComponent } from './ipsr-submit-progress.component';
import { IpsrCompletenessStatusService } from '../../../../services/ipsr-completeness-status.service';
import { IpsrDataControlService } from '../../../../services/ipsr-data-control.service';
import { FieldsManagerService } from '../../../../../../shared/services/fields-manager.service';

/**
 * P2-3748. The package screen used to say nothing at all: Submit was greyed out and the words
 * "missing", "pending" and "alerts" appeared nowhere around it (measured on prtest #9409,
 * 2026-09-21). Every fact this panel shows already arrived in the green-check response and was
 * being thrown away.
 */
describe('IpsrSubmitProgressComponent', () => {
  let fixture: ComponentFixture<IpsrSubmitProgressComponent>;
  let component: IpsrSubmitProgressComponent;
  let navigate: jest.Mock;

  const status = signal<any>(null);

  const build = (isP25 = true) => {
    navigate = jest.fn();
    TestBed.configureTestingModule({
      imports: [IpsrSubmitProgressComponent],
      providers: [
        { provide: IpsrCompletenessStatusService, useValue: { status } },
        { provide: IpsrDataControlService, useValue: { resultInnovationCode: '9409', resultInnovationPhase: '37' } },
        { provide: FieldsManagerService, useValue: { isP25: () => isP25 } },
        { provide: Router, useValue: { navigate } }
      ]
    });
    fixture = TestBed.createComponent(IpsrSubmitProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  /** The payload the validation module returns, as read live from prtest for package 9409. */
  const payload = (stepOneValid: boolean) => ({
    validResult: false,
    mainSection: [
      { sectionName: 'General Information', validation: true },
      { sectionName: 'Contributors', validation: true },
      { sectionName: 'IPSR Innovation use pathway', validation: stepOneValid }
    ],
    stepSections: [
      { step: 1, sectionName: 'Step 1', validation: stepOneValid },
      { step: 2, sectionName: 'Step 2', validation: true },
      { step: 3, sectionName: 'Step 3', validation: true },
      { step: 4, sectionName: 'Step 4', validation: true }
    ]
  });

  afterEach(() => status.set(null));

  it('shows nothing until the green checks answer', () => {
    build();
    expect(component.showRing()).toBe(false);
    expect(fixture.nativeElement.querySelector('[data-testid="ipsr-submit-progress"]')).toBeNull();
  });

  it('nests the pathway steps under their tab', () => {
    status.set(payload(false));
    build();

    const labels = component.entries().map(e => `${e.nested ? '  ' : ''}${e.label}`);
    expect(labels).toEqual(['General information', 'Contributors and Partners', 'Package and Assess', '  Step 1', '  Step 2', '  Step 3', '  Step 4']);
  });

  it('names the step that is blocking, not just the tab', () => {
    status.set(payload(false));
    build();

    // The pathway tab is a heading over its steps: one missing step must read as ONE gap.
    expect(component.missing().map(e => e.label)).toEqual(['Step 1']);
    expect(component.label()).toBe('5 of 6 complete');
  });

  it('reports readiness once every section is valid', () => {
    status.set(payload(true));
    build();

    expect(component.isComplete()).toBe(true);
    expect(component.label()).toBe('Ready to submit');
    expect(component.ringOffset()).toBe(0);
  });

  it('sends the reporter to the blocking step, carrying the phase', () => {
    status.set(payload(false));
    build();

    component.goTo(component.missing()[0]);

    expect(navigate).toHaveBeenCalledWith(['/ipsr/detail/9409', 'ipsr-innovation-use-pathway', 'step-1'], { queryParams: { phase: '37' } });
  });

  /** Outside P25 the tab keeps its old name and "Link to results" is still a tab of its own. */
  it('follows the tab names actually rendered by the top menu', () => {
    status.set({ ...payload(false), mainSection: [...payload(false).mainSection, { sectionName: 'Link to results', validation: false }] });
    build(false);

    const labels = component.entries().filter(e => !e.nested).map(e => e.label);
    expect(labels).toEqual(['General information', 'Contributors', 'IPSR Innovation use pathway', 'Link to results']);
  });

  it('offers no Go on the heading, only on the step below it', () => {
    status.set(payload(false));
    build();
    component.openPanel();
    fixture.detectChanges();

    const gos = [...fixture.nativeElement.querySelectorAll('#ipsr-submit-progress-panel button')].filter(b => b.textContent.trim() === 'Go');
    expect(gos).toHaveLength(1);
    expect(gos[0].getAttribute('aria-label')).toBe('Go to Step 1');
  });

  it('renders the ring and opens the panel on hover', () => {
    status.set(payload(false));
    build();

    const trigger = fixture.nativeElement.querySelector('[data-testid="ipsr-submit-progress"]');
    expect(trigger.textContent).toContain('5 of 6 complete');
    expect(trigger.querySelector('svg circle')).toBeTruthy();

    component.openPanel();
    fixture.detectChanges();

    const panel = fixture.nativeElement.querySelector('#ipsr-submit-progress-panel');
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Step 1');
    expect(panel.textContent).toContain('Complete to submit');
  });
});
