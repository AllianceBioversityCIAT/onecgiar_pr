import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpdateNotificationComponent } from './update-notification.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('UpdateNotificationComponent', () => {
  let component: UpdateNotificationComponent;
  let fixture: ComponentFixture<UpdateNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateNotificationComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('getNotificationAction should map types 1,2,3,5 and default', () => {
    expect(component.getNotificationAction(1)).toBe('submitted');
    expect(component.getNotificationAction(2)).toBe('unsubmitted');
    expect(component.getNotificationAction(3)).toBe('Quality Assessed');
    expect(component.getNotificationAction(5)).toBe('created');
    expect(component.getNotificationAction(999)).toBe('');
  });
});
