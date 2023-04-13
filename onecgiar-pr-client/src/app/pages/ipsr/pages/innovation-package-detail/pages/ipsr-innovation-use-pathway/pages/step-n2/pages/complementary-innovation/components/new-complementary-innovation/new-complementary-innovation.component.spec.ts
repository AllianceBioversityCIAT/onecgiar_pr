import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewComplementaryInnovationComponent } from './new-complementary-innovation.component';

describe('NewComplementaryInnovationComponent', () => {
  let component: NewComplementaryInnovationComponent;
  let fixture: ComponentFixture<NewComplementaryInnovationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewComplementaryInnovationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewComplementaryInnovationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
