import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitCompletenessStatusComponent } from './init-completeness-status.component';

describe('InitCompletenessStatusComponent', () => {
  let component: InitCompletenessStatusComponent;
  let fixture: ComponentFixture<InitCompletenessStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InitCompletenessStatusComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InitCompletenessStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
