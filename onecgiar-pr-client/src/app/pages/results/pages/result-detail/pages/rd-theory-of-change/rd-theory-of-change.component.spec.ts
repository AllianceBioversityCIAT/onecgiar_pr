import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RdTheoryOfChangeComponent } from './rd-theory-of-change.component';

describe('RdTheoryOfChangeComponent', () => {
  let component: RdTheoryOfChangeComponent;
  let fixture: ComponentFixture<RdTheoryOfChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RdTheoryOfChangeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RdTheoryOfChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
