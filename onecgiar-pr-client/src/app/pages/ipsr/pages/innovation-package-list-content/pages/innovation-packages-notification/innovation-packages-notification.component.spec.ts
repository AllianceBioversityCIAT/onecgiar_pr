import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationPackagesNotificationComponent } from './innovation-packages-notification.component';

describe('InnovationPackagesNotificationComponent', () => {
  let component: InnovationPackagesNotificationComponent;
  let fixture: ComponentFixture<InnovationPackagesNotificationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationPackagesNotificationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationPackagesNotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
