import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TheoryOfChangeComponent } from './theory-of-change.component';

describe('TheoryOfChangeComponent', () => {
  let component: TheoryOfChangeComponent;
  let fixture: ComponentFixture<TheoryOfChangeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TheoryOfChangeComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TheoryOfChangeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
