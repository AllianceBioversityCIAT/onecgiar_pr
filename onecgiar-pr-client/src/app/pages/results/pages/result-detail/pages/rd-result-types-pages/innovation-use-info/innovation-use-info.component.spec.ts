import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationUseInfoComponent } from './innovation-use-info.component';

describe('InnovationUseInfoComponent', () => {
  let component: InnovationUseInfoComponent;
  let fixture: ComponentFixture<InnovationUseInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InnovationUseInfoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InnovationUseInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
