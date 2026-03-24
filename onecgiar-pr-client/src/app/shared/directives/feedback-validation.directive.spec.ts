import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FeedbackValidationDirective } from './feedback-validation.directive';

@Component({
  template: `<div appFeedbackValidation [labelText]="label" [isComplete]="complete"></div>`,
  standalone: false
})
class TestComponent {
  label = 'Test Label';
  complete = false;
}

describe('FeedbackValidationDirective', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FeedbackValidationDirective, TestComponent]
    });
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
  });

  it('should create an instance', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should add complete class when isComplete is true on init', () => {
    component.complete = true;
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('.pr-field');
    expect(element.classList.contains('complete')).toBe(true);
  });

  it('should not add complete class when isComplete is false on init', () => {
    component.complete = false;
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('.pr-field');
    expect(element.classList.contains('complete')).toBe(false);
  });

  it('should add complete class when isComplete changes to true', () => {
    component.complete = false;
    fixture.detectChanges();
    component.complete = true;
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('.pr-field');
    expect(element.classList.contains('complete')).toBe(true);
  });

  it('should remove complete class when isComplete changes to false', () => {
    component.complete = true;
    fixture.detectChanges();
    component.complete = false;
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('.pr-field');
    expect(element.classList.contains('complete')).toBe(false);
  });
});
