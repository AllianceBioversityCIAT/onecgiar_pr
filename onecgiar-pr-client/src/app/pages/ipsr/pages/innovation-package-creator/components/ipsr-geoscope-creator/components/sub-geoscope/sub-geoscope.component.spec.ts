import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubGeoscopeComponent } from './sub-geoscope.component';

describe('SubGeoscopeComponent', () => {
  let component: SubGeoscopeComponent;
  let fixture: ComponentFixture<SubGeoscopeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubGeoscopeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubGeoscopeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
