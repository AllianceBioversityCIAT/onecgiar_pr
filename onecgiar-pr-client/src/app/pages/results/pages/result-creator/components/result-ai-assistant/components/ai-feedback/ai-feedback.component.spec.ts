import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiFeedbackComponent } from './ai-feedback.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('AiFeedbackComponent', () => {
  let component: AiFeedbackComponent;
  let fixture: ComponentFixture<AiFeedbackComponent>;

  const createPopoverMock = () => {
    return {
      show: jest.fn(),
      hide: jest.fn(),
      align: jest.fn(),
      container: {} as unknown
    } as any;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiFeedbackComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(AiFeedbackComponent);
    component = fixture.componentInstance;
    // Provide a mock for the ViewChild Popover
    component.feedbackPanel = createPopoverMock();
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

  it('should show popover and set type on first toggle', () => {
    const event = {} as Event;
    const showSpy = jest.spyOn(component.feedbackPanel, 'show');
    const alignSpy = jest.spyOn(component.feedbackPanel, 'align');

    component.toggleFeedback(event, 'good');

    expect(component.feedbackType()).toBe('good');
    expect(component.selectedType()).toEqual([]);
    expect(component.body().feedbackText).toBe('');
    expect(showSpy).toHaveBeenCalledWith(event);
    if (component.feedbackPanel.container) {
      expect(alignSpy).toHaveBeenCalled();
    }
  });

  it('should hide popover and reset when toggling same type again', () => {
    const event = {} as Event;
    const hideSpy = jest.spyOn(component.feedbackPanel, 'hide');

    component.toggleFeedback(event, 'good');
    expect(component.feedbackType()).toBe('good');

    component.toggleFeedback(event, 'good');
    expect(hideSpy).toHaveBeenCalled();
    expect(component.feedbackType()).toBeNull();
    expect(component.selectedType()).toEqual([]);
  });

  it('isRequired should reflect when feedbackType is bad', () => {
    const event = {} as Event;
    component.toggleFeedback(event, 'bad');
    expect(component.isRequired()).toBe(true);
    component.toggleFeedback(event, 'bad');
    expect(component.isRequired()).toBe(false);
  });

  it('should not submit when bad feedback missing type or text', async () => {
    jest.useFakeTimers();
    const event = {} as Event;
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
    const event = {} as Event;
    const hideSpy = jest.spyOn(component.feedbackPanel, 'hide');

    component.toggleFeedback(event, 'good');
    const initialType = component.feedbackType();

    const promise = component.submitFeedback();
    expect(component.loadingFeedback()).toBe(true);

    jest.advanceTimersByTime(2000);
    await promise;

    expect(component.loadingFeedback()).toBe(false);
    expect(component.feedbackSent()).toBe(true);
    expect(component.lastFeedbackType()).toBe(initialType);
    expect(hideSpy).toHaveBeenCalled();
    expect(component.feedbackType()).toBeNull();

    jest.useRealTimers();
  });

  it('should submit successfully for bad feedback when type and text provided', async () => {
    jest.useFakeTimers();
    const event = {} as Event;
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
    expect(component.feedbackType()).toBeNull();

    jest.useRealTimers();
  });
});
