import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChangeResultTypeModalComponent } from './change-result-type-modal.component';

describe('ChangeResultTypeModalComponent', () => {
  let component: ChangeResultTypeModalComponent;
  let fixture: ComponentFixture<ChangeResultTypeModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChangeResultTypeModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangeResultTypeModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
