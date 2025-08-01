import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InnovationPackageComponent } from './innovation-package.component';
import { ApiService } from '../../../../../../shared/services/api/api.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('InnovationPackageComponent', () => {
  let component: InnovationPackageComponent;
  let fixture: ComponentFixture<InnovationPackageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InnovationPackageComponent],
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InnovationPackageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should have appModuleId as 2', () => {
    expect(component.appModuleId).toBe(2);
  });

  it('should call onPhaseUpdate without error', () => {
    expect(() => component.onPhaseUpdate()).not.toThrow();
  });
});
