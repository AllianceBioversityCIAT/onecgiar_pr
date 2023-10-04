import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleWPsComponent } from './multiple-wps.component';

describe('MultipleWPsComponent', () => {
  let component: MultipleWPsComponent;
  let fixture: ComponentFixture<MultipleWPsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MultipleWPsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultipleWPsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
