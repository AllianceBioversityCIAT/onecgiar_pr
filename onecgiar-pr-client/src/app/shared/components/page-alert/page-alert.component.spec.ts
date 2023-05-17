import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageAlertComponent } from './page-alert.component';

describe('PageAlertComponent', () => {
  let component: PageAlertComponent;
  let fixture: ComponentFixture<PageAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PageAlertComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PageAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
