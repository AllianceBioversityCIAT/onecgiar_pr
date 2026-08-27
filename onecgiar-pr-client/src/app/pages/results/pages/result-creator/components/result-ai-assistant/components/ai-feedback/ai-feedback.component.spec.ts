import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiFeedbackComponent } from './ai-feedback.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AiFeedbackComponent', () => {
  let component: AiFeedbackComponent;
  let fixture: ComponentFixture<AiFeedbackComponent>;

  // Mimics the click event the thumbs buttons pass to toggleFeedback:
  // needs stopPropagation() + a currentTarget the component can measure.
  const createEvent = () =>
    ({
      stopPropagation: jest.fn(),
      currentTarget: {
        getBoundingClientRect: () => ({ bottom: 0, right: 0, top: 0, left: 0, width: 0, height: 0 })
      }
    }) as unknown as Event;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiFeedbackComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AiFeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle type selection', () => {
    expect(component.selectedType()).toEqual([]);
    component.selectType('Incorrect');
    expect(component.selectedType()).toEqual(['Incorrect']);
    component.selectType('Incorrect');
    expect(component.selectedType()).toEqual([]);
  });

  it('should open panel and set type on first toggle', () => {
    const event = createEvent();

    component.toggleFeedback(event, 'good');

    expect(component.feedbackType()).toBe('good');
    expect(component.feedbackOpen()).toBe(true);
    expect(component.selectedType()).toEqual([]);
    expect(component.body().feedbackText).toBe('');
  });

  it('should close panel and reset when toggling same type again', () => {
    const event = createEvent();

    component.toggleFeedback(event, 'good');
    expect(component.feedbackType()).toBe('good');
    expect(component.feedbackOpen()).toBe(true);

    component.toggleFeedback(event, 'good');
    expect(component.feedbackOpen()).toBe(false);
    expect(component.feedbackType()).toBeNull();
    expect(component.selectedType()).toEqual([]);
  });

  it('isRequired should reflect when feedbackType is bad', () => {
    const event = createEvent();
    component.toggleFeedback(event, 'bad');
    expect(component.isRequired()).toBe(true);
    component.toggleFeedback(event, 'bad');
    expect(component.isRequired()).toBe(false);
  });

  it('should not submit when bad feedback missing type or text', async () => {
    jest.useFakeTimers();
    const event = createEvent();
    component.toggleFeedback(event, 'bad');

    // Missing both selectedType and feedbackText
    await component.submitFeedback();
    expect(component.loadingFeedback()).toBe(false);

    // Has type but missing text
    component.selectType('Incorrect');
    await component.submitFeedback();
    expect(component.loadingFeedback()).toBe(false);

    jest.useRealTimers();
  });

  it('should submit successfully for good feedback', async () => {
    jest.useFakeTimers();
    const event = createEvent();

    component.toggleFeedback(event, 'good');
    const initialType = component.feedbackType();

    const promise = component.submitFeedback();
    expect(component.loadingFeedback()).toBe(true);

    jest.advanceTimersByTime(2000);
    await promise;

    expect(component.loadingFeedback()).toBe(false);
    expect(component.feedbackSent()).toBe(true);
    expect(component.lastFeedbackType()).toBe(initialType);
    expect(component.feedbackOpen()).toBe(false);
    expect(component.feedbackType()).toBeNull();

    jest.useRealTimers();
  });

  it('should submit successfully for bad feedback when type and text provided', async () => {
    jest.useFakeTimers();
    const event = createEvent();
    component.toggleFeedback(event, 'bad');
    component.selectType('Incorrect');
    component.body.update(b => ({ ...b, feedbackText: 'Details about the issue' }));

    const promise = component.submitFeedback();
    expect(component.loadingFeedback()).toBe(true);

    jest.advanceTimersByTime(2000);
    await promise;

    expect(component.loadingFeedback()).toBe(false);
    expect(component.feedbackSent()).toBe(true);
    expect(component.lastFeedbackType()).toBe('bad');
    expect(component.feedbackOpen()).toBe(false);
    expect(component.feedbackType()).toBeNull();

    jest.useRealTimers();
  });
});
