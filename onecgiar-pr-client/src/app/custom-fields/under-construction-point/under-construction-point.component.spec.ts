import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnderConstructionPointComponent } from './under-construction-point.component';

describe('UnderConstructionPointComponent', () => {
  let component: UnderConstructionPointComponent;
  let fixture: ComponentFixture<UnderConstructionPointComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnderConstructionPointComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnderConstructionPointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
