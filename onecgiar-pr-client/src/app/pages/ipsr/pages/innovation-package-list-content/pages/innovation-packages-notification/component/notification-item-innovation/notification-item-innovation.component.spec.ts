import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationItemInnovationComponent } from './notification-item-innovation.component';

describe('NotificationItemInnovationComponent', () => {
  let component: NotificationItemInnovationComponent;
  let fixture: ComponentFixture<NotificationItemInnovationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NotificationItemInnovationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationItemInnovationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
