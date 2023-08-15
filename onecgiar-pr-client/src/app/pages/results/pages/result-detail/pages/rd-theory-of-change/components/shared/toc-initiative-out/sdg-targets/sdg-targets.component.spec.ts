import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SdgTargetsComponent } from './sdg-targets.component';

describe('SdgTargetsComponent', () => {
  let component: SdgTargetsComponent;
  let fixture: ComponentFixture<SdgTargetsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SdgTargetsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SdgTargetsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
