import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompletenessStatusComponent } from './completeness-status.component';

describe('CompletenessStatusComponent', () => {
  let component: CompletenessStatusComponent;
  let fixture: ComponentFixture<CompletenessStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CompletenessStatusComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompletenessStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
