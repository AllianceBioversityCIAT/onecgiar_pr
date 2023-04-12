import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplementaryInnovationComponent } from './complementary-innovation.component';

describe('ComplementaryInnovationComponent', () => {
  let component: ComplementaryInnovationComponent;
  let fixture: ComponentFixture<ComplementaryInnovationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ComplementaryInnovationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComplementaryInnovationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
