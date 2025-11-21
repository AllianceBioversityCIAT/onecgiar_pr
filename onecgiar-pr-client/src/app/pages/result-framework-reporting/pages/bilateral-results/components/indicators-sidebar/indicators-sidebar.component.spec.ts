import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndicatorsSidebarComponent } from './indicators-sidebar.component';

describe('IndicatorsSidebarComponent', () => {
  let component: IndicatorsSidebarComponent;
  let fixture: ComponentFixture<IndicatorsSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndicatorsSidebarComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IndicatorsSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
