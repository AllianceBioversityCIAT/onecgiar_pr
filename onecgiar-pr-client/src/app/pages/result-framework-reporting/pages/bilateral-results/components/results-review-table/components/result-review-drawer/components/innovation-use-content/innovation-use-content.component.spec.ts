import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InnovationUseContentComponent } from './innovation-use-content.component';

describe('InnovationUseContentComponent', () => {
  let component: InnovationUseContentComponent;
  let fixture: ComponentFixture<InnovationUseContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InnovationUseContentComponent, HttpClientTestingModule, NoopAnimationsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
