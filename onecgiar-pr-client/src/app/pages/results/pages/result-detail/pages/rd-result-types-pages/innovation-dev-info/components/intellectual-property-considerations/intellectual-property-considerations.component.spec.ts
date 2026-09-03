import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IntellectualPropertyConsiderationsComponent } from './intellectual-property-considerations.component';
import { InnovationDevInfoUtilsService } from '../../services/innovation-dev-info-utils.service';

/**
 * P2-3272 / P2-3513 — the single Intellectual Property question of the 2026
 * Innovation Development form.
 *
 * The acceptance criteria pinned here are the ones a template or a copy edit can
 * silently break: the three options, the notice shown only for Yes / Not sure, the
 * notice wording being about SUBMISSION and not about the click (the PO's Option B),
 * and the form surviving a slot the server could not match.
 */
describe('IntellectualPropertyConsiderationsComponent', () => {
  let component: IntellectualPropertyConsiderationsComponent;
  let fixture: ComponentFixture<IntellectualPropertyConsiderationsComponent>;
  let mockUtils: { mapBoolean: jest.Mock };

  const QUESTION_TEXT = 'Do you have any Intellectual Property considerations for this innovation?';

  /** Mirrors the payload `intellectualPropertyRightsV2` serves from the 2026 phase on. */
  const buildOptions = () => ({
    intellectual_property_rights: {
      q1: {
        result_question_id: 207,
        question_text: QUESTION_TEXT,
        question_description: null,
        options: ['Yes', 'Not sure', 'No'].map((question_text, i) => ({
          result_question_id: 208 + i,
          question_text,
          answer_boolean: null,
          answer_text: null
        }))
      }
    }
  });

  /**
   * Re-renders after a direct mutation. In the running app the radio's own event listener marks the
   * view dirty; a spec that pokes the model has to say so itself, or `checkNoChanges` trips on the
   * stale binding.
   */
  const render = () => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  /** Sets the slot the radio would have set and replays the component's own handler. */
  const select = (optionText: string) => {
    const option = component.question.options.find((o: any) => o.question_text === optionText);
    component.question['radioButtonValue'] = option.result_question_id;
    component.handleSelectionChange();
    render();
    return option;
  };

  const renderedText = () => fixture.nativeElement.textContent as string;

  beforeEach(async () => {
    mockUtils = { mapBoolean: jest.fn() };

    await TestBed.configureTestingModule({
      declarations: [IntellectualPropertyConsiderationsComponent],
      providers: [{ provide: InnovationDevInfoUtilsService, useValue: mockUtils }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(IntellectualPropertyConsiderationsComponent);
    component = fixture.componentInstance;
    component.options = buildOptions() as any;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('serves the question with exactly three options: Yes / Not sure / No', () => {
    expect(component.question.options.map((o: any) => o.question_text)).toEqual(['Yes', 'Not sure', 'No']);
  });

  it('shows no notice until the question is answered', () => {
    expect(component.isTriggerSelected).toBe(false);
    expect(renderedText()).not.toContain('IP focal point');
  });

  it('shows the notice on "Yes"', () => {
    select('Yes');
    expect(component.isTriggerSelected).toBe(true);
    expect(renderedText()).toContain("lead Center's IP focal point");
  });

  it('shows the notice on "Not sure" too', () => {
    select('Not sure');
    expect(component.isTriggerSelected).toBe(true);
  });

  it('hides the notice on "No"', () => {
    select('No');
    expect(component.isTriggerSelected).toBe(false);
    expect(renderedText()).not.toContain('IP focal point');
  });

  it('words the notice for submission time, not for the click (PO Option B)', () => {
    // The story's first draft said the email leaves the moment the answer is picked; the PO
    // confirmed it leaves on submission. If the copy loses "submit", the screen promises
    // something the server does not do until later.
    expect(component.notificationDisclosure).toContain('when you submit this result');
    expect(component.notificationDisclosure).not.toMatch(/immediately/i);
  });

  it('shows the Intellectual Property definition link on Yes, and not on No', () => {
    // Info Point 1. The story gives this URL with an "exact URL to be confirmed" note; if it ever
    // changes, it changes in one constant and this test says so.
    select('Yes');
    const link = fixture.nativeElement.querySelector('a[target="_blank"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('https://www.wipo.int/about-ip/en/');
    expect(link.textContent.trim()).toBe('What is Intellectual Property?');

    select('No');
    expect(fixture.nativeElement.querySelector('a[target="_blank"]')).toBeNull();
  });

  it('opens the definition link safely', () => {
    // `target="_blank"` without `rel="noopener"` hands the opened page a handle on this one.
    select('Not sure');
    const link = fixture.nativeElement.querySelector('a[target="_blank"]');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('shows BOTH info points together, which is what the acceptance criterion asks', () => {
    select('Yes');
    expect(fixture.nativeElement.querySelectorAll('.message').length).toBe(2);
  });

  it('marks the section complete as soon as any option is picked', () => {
    expect(component.isComplete).toBe(false);
    select('No');
    expect(component.isComplete).toBe(true);
  });

  it('renders nothing and does not throw when the server could not match the question', () => {
    // The state of any environment where the migration has not run yet: the slot comes back
    // undefined and the whole Innovation Development form used to go down with it.
    component.options = { intellectual_property_rights: {} } as any;

    expect(() => render()).not.toThrow();
    expect(component.question).toBeUndefined();
    expect(renderedText()).not.toContain('Intellectual property rights');
  });
});
