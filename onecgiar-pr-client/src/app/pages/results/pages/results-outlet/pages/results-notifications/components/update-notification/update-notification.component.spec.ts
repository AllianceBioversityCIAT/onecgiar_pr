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

  it('renders the center comma attached to the result link (NDCW-R-2)', () => {
    const fresh = TestBed.createComponent(UpdateNotificationComponent);
    fresh.componentInstance.notification = {
      notification_level: 2,
      notification_id: 1,
      created_date: new Date().toISOString(),
      text: 'where your center was tagged, has been approved by the Science Program SP03.',
      obj_notification_type: { type: 'Bilateral Result Approved' },
      obj_notification_level: { notifications_level_id: 2 },
      obj_result: { result_code: 9561, title: 'T', obj_result_by_initiatives: [], obj_version: { id: 1 } }
    };
    fresh.detectChanges();
    const p: HTMLElement = fresh.nativeElement.querySelector('.update_notification_content_body_text');
    const flat = p.textContent!.replace(/\s+/g, ' ').trim();
    expect(flat).toBe('The result 9561 - T, where your center was tagged, has been approved by the Science Program SP03.');
    expect(p.querySelector('a')!.textContent).toBe('9561 - T');
    expect(p.querySelector('a')!.nextSibling!.textContent).toMatch(/^,/);
  });
});
