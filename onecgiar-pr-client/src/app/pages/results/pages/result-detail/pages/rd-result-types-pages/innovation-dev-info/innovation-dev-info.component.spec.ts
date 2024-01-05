import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationDevInfoComponent } from './innovation-dev-info.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InnovationDevInfoComponent', () => {
  let component: InnovationDevInfoComponent;
  let fixture: ComponentFixture<InnovationDevInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationDevInfoComponent],
      imports: [HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationDevInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
