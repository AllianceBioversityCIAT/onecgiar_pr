import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InnovationPackageComponent } from './innovation-package.component';
import { HttpClientModule } from '@angular/common/http';

describe('InnovationPackageComponent', () => {
  let component: InnovationPackageComponent;
  let fixture: ComponentFixture<InnovationPackageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationPackageComponent],
      imports: [HttpClientModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationPackageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
