import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultHistoryOfChangesModalComponent } from './result-history-of-changes-modal.component';

describe('ResultHistoryOfChangesModalComponent', () => {
  let component: ResultHistoryOfChangesModalComponent;
  let fixture: ComponentFixture<ResultHistoryOfChangesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResultHistoryOfChangesModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultHistoryOfChangesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
