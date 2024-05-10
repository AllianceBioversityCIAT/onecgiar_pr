import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationItemInnovationComponent } from './notification-item-innovation.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('NotificationItemInnovationComponent', () => {
  let component: NotificationItemInnovationComponent;
  let fixture: ComponentFixture<NotificationItemInnovationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NotificationItemInnovationComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationItemInnovationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
