import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnsubmitModalComponent } from './unsubmit-modal.component';

describe('UnsubmitModalComponent', () => {
  let component: UnsubmitModalComponent;
  let fixture: ComponentFixture<UnsubmitModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UnsubmitModalComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnsubmitModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
