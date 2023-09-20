import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertGlobalInfoComponent } from './alert-global-info.component';

describe('AlertGlobalInfoComponent', () => {
  let component: AlertGlobalInfoComponent;
  let fixture: ComponentFixture<AlertGlobalInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlertGlobalInfoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertGlobalInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
