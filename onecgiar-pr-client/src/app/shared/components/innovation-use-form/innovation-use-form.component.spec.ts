import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationUseFormComponent } from './innovation-use-form.component';
import { HttpClientModule } from '@angular/common/http';

describe('InnovationUseFormComponent', () => {
  let component: InnovationUseFormComponent;
  let fixture: ComponentFixture<InnovationUseFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationUseFormComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
