import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultipleWPsContentComponent } from './multiple-wps-content.component';

describe('MultipleWPsContentComponent', () => {
  let component: MultipleWPsContentComponent;
  let fixture: ComponentFixture<MultipleWPsContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MultipleWPsContentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultipleWPsContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
