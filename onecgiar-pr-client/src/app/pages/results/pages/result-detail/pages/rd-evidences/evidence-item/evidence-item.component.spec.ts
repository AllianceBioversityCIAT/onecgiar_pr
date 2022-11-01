import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EvidenceItemComponent } from './evidence-item.component';

describe('EvidenceItemComponent', () => {
  let component: EvidenceItemComponent;
  let fixture: ComponentFixture<EvidenceItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EvidenceItemComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvidenceItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
